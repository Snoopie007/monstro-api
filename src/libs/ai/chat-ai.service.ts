import { BotConfigService } from './bot-config.service';
import { MemberContextBuilder } from './member-context';
import { buildSupportTools } from './FnctionHandlers';
import { AIModelService } from './models';
import { db } from '@/db/db';
import { supportConversations, supportMessages, supportBots } from '@/db/schemas';
import { eq, desc, and } from 'drizzle-orm';

export interface ChatResponse {
  message: string;
  conversationId: string;
  trigger?: string;
  memberName: string;
  modelUsed: string;
  timestamp: string;
}

export class ChatAIService {
  private botConfigService: BotConfigService;
  private contextBuilder: MemberContextBuilder;
  private modelService: AIModelService;

  constructor() {
    this.botConfigService = new BotConfigService();
    this.contextBuilder = new MemberContextBuilder();
    this.modelService = new AIModelService();
  }

  /**
   * Generate AI response for member chat
   */
  async generateResponse(
    memberId: string,
    locationId: string,
    userMessage: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    try {
      console.log(`🤖 Generating response for member ${memberId} at location ${locationId}`);

      // Get bot configuration from existing tables
      const botConfig = await this.botConfigService.getBotConfig(locationId);

      // Validate bot is ready for interactions
      if (!(await this.botConfigService.isBotActive(locationId))) {
        throw new Error(`Support bot is not active for location ${locationId}`);
      }

      // Validate model access
      if (!this.modelService.validateModelAccess(botConfig.model as any)) {
        console.warn(`API key not configured for model: ${botConfig.model}, using OpenAI fallback`);
      }

      // Build member context with real database calls
      const memberContext = await this.contextBuilder.buildContext(memberId, locationId);

      // Check for trigger matches
      const matchedTrigger = this.botConfigService.evaluateTriggers(
        userMessage,
        botConfig.triggers
      );

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await this.getConversation(conversationId);
        if (conversation.memberId !== memberId) {
          throw new Error('Conversation access denied');
        }
      } else {
        conversation = await this.createConversation(memberId, botConfig.id);
      }

      // Ensure conversation exists (TypeScript guard)
      if (!conversation) {
        throw new Error('Failed to get or create conversation');
      }

      // Save user message to database
      await this.saveMessage(conversation.id, userMessage, 'user');

      // Build system prompt from bot config
      const systemPrompt = this.botConfigService.buildSystemPrompt(botConfig, memberContext);

      // Get available tools
      const tools = buildSupportTools(botConfig.availableTools);

      let response = '';

      if (matchedTrigger) {
        console.log(`🎯 Trigger activated: ${matchedTrigger.name}`);
        response = await this.handleTriggeredResponse(matchedTrigger, tools, memberId, botConfig, conversation.id);
      } else {
        response = await this.handleGeneralResponse(
          userMessage,
          tools,
          memberId,
          botConfig,
          memberContext,
          systemPrompt,
          conversation.id
        );
      }

      // Save AI response to database
      await this.saveMessage(conversation.id, response, 'ai');

      return {
        message: response,
        conversationId: conversation.id,
        trigger: matchedTrigger?.name,
        memberName: `${memberContext.firstName} ${memberContext.lastName}`,
        modelUsed: botConfig.model,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('💥 AI Chat Error:', error);

      // Still try to save error to conversation if possible
      if (conversationId) {
        try {
          await this.saveMessage(conversationId, "I encountered an error processing your request. Please try again or contact support.", 'ai');
        } catch (saveError) {
          console.error('Failed to save error message:', saveError);
        }
      }

      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Handle triggered responses (when specific triggers are matched)
   */
  private async handleTriggeredResponse(
    trigger: any,
    tools: any[],
    memberId: string,
    botConfig: any,
    conversationId: string
  ): Promise<string> {
    let response = `🎯 Trigger "${trigger.name}" activated!\n\n`;

    // Execute trigger tool call
    if (trigger.toolCall?.name) {
      const tool = tools.find(t => t.name === trigger.toolCall.name);
      if (tool) {
        try {
          const context = {
            locationId: botConfig.locationId,
            supportBotId: botConfig.id,
            conversationId
          };
          const toolResult = await tool.invoke(
            { memberId, ...trigger.toolCall.args },
            context
          );
          response += toolResult;
        } catch (toolError) {
          console.error('Error executing trigger tool:', toolError);
          response += "I encountered an error processing your request. Please try again or contact support.";
        }
      } else {
        response += `Tool "${trigger.toolCall.name}" is not available.`;
      }
    }

    return response;
  }

  /**
   * Handle general responses (using AI models and direct tool calling)
   */
  private async handleGeneralResponse(
    userMessage: string,
    tools: any[],
    memberId: string,
    botConfig: any,
    memberContext: any,
    systemPrompt: string,
    conversationId: string
  ): Promise<string> {

    // For common queries, use direct tool calling without AI model
    const messageLower = userMessage.toLowerCase();

    if (messageLower.includes('membership') || messageLower.includes('subscription')) {
      const tool = tools.find(t => t.name === 'get_member_status');
      if (tool) {
        return await tool.invoke({ memberId }, {
          locationId: botConfig.locationId,
          supportBotId: botConfig.id
        });
      }
    }

    if (messageLower.includes('billing') || messageLower.includes('payment')) {
      const tool = tools.find(t => t.name === 'get_member_billing');
      if (tool) {
        return await tool.invoke({ memberId }, {
          locationId: botConfig.locationId,
          supportBotId: botConfig.id
        });
      }
    }

    if (messageLower.includes('classes') || messageLower.includes('book')) {
      const tool = tools.find(t => t.name === 'get_member_bookable_sessions');
      if (tool) {
        return await tool.invoke({ memberId }, {
          locationId: botConfig.locationId,
          supportBotId: botConfig.id
        });
      }
    }

    if (messageLower.includes('help') || messageLower.includes('issue') || messageLower.includes('problem')) {
      const tool = tools.find(t => t.name === 'create_support_ticket');
      if (tool) {
        return await tool.invoke({
          title: 'General Support Request',
          description: userMessage,
          priority: 3
        }, {
          locationId: botConfig.locationId,
          supportBotId: botConfig.id,
          conversationId
        });
      }
    }

    // TODO: Implement full AI model integration for complex conversations
    // const model = this.modelService.getModel(botConfig.model, {
    //   temperature: botConfig.temperature / 100,
    //   streaming: false,
    //   maxTokens: 500
    // });

    // // Get conversation history for context
    // const conversationHistory = await this.getConversationMessages(conversationId, 15);

    // // Build messages array for AI model
    // const messages = [
    //   { role: 'system', content: systemPrompt },
    //   ...conversationHistory,
    //   { role: 'user', content: userMessage }
    // ];

    // // Generate AI response with tools
    // const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;
    // const aiResponse = await modelWithTools.invoke(messages);
    // return aiResponse.content;

    // Fallback response for now
    return `Hello ${memberContext.firstName}! I'm your support assistant for ${memberContext.locationName}. I can help you with:

• **"membership status"** - Check your current subscriptions and packages
• **"billing information"** - View your account and payment details  
• **"available classes"** - See what you can book with your membership
• **"help with [issue]"** - Create support tickets for any problems
• **General questions** - I'll connect you with our support team

What would you like to know about? (Powered by ${botConfig.model.toUpperCase()})`;
  }

  /**
   * Get conversation message history for AI context
   */
  private async getConversationMessages(conversationId: string, limit: number = 20) {
    try {
      console.log(`📚 Getting conversation history for ${conversationId} (limit: ${limit})`);

      const messages = await db.query.supportMessages.findMany({
        where: eq(supportMessages.conversationId, conversationId),
        orderBy: [desc(supportMessages.createdAt)],
        limit: Math.min(limit, 50),
      });

      // Return in chronological order for AI context
      const chronologicalMessages = messages.reverse().map(message => ({
        role: message.role === 'AI' ? 'assistant' : message.role === 'User' ? 'user' : 'system',
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        metadata: message.metadata
      }));

      console.log(`📚 Retrieved ${chronologicalMessages.length} messages from conversation history`);
      return chronologicalMessages;

    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return [];
    }
  }

  /**
   * Get conversation history with messages (public method for API endpoints)
   */
  async getConversationHistory(conversationId: string, memberId: string) {
    try {
      // Verify conversation belongs to member
      const conversation = await db.query.supportConversations.findFirst({
        where: and(
          eq(supportConversations.id, conversationId),
          eq(supportConversations.memberId, memberId)
        ),
        with: {
          supportBot: true
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Get messages
      const messages = await db.query.supportMessages.findMany({
        where: eq(supportMessages.conversationId, conversationId),
        orderBy: [desc(supportMessages.createdAt)],
        limit: 50,
      });

      // Serialize dates for API response
      const serializedMessages = messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      }));

      return {
        conversation: {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt?.toISOString(),
          takenOverAt: conversation.takenOverAt?.toISOString(),
        },
        messages: serializedMessages.reverse()
      };

    } catch (error) {
      console.error("Error fetching conversation history:", error);
      throw error;
    }
  }

  /**
   * Get member's conversations for a location
   */
  async getMemberConversations(memberId: string, locationId: string) {
    try {
      // Get support bot for location
      const supportBot = await db.query.supportBots.findFirst({
        where: eq(supportBots.locationId, locationId)
      });

      if (!supportBot) {
        return { conversations: [], message: 'No support bot configured for this location' };
      }

      // Get member's conversations
      const conversations = await db.query.supportConversations.findMany({
        where: and(
          eq(supportConversations.memberId, memberId),
          eq(supportConversations.supportBotId, supportBot.id)
        ),
        orderBy: desc(supportConversations.updatedAt),
        limit: 10
      });

      return {
        conversations: conversations.map(conv => ({
          ...conv,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt?.toISOString(),
          takenOverAt: conv.takenOverAt?.toISOString(),
        }))
      };

    } catch (error) {
      console.error("Error fetching member conversations:", error);
      throw error;
    }
  }

  // Private helper methods
  private async getConversation(conversationId: string) {
    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, conversationId),
      with: {
        supportBot: true
      }
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  private async createConversation(memberId: string, supportBotId: string) {
    console.log(`✨ Creating new conversation for member ${memberId} with bot ${supportBotId}`);

    const [newConversation] = await db
      .insert(supportConversations)
      .values({
        supportBotId,
        memberId,
        isVendorActive: false,
        metadata: {
          createdBy: 'api-chat',
          createdVia: 'member-app'
        },
      })
      .returning();

    return newConversation;
  }

  private async saveMessage(conversationId: string, content: string, role: 'user' | 'ai') {
    const [savedMessage] = await db.insert(supportMessages).values({
      conversationId,
      content,
      role: role === 'user' ? 'User' : 'AI',
      channel: 'WebChat',
      metadata: {
        savedAt: new Date().toISOString(),
        source: 'api-chat'
      },
    }).returning();

    // Update conversation timestamp
    await db
      .update(supportConversations)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(supportConversations.id, conversationId));

    return savedMessage;
  }
}
