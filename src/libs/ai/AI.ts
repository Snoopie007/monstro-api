import { SupportAssistantService, } from './SupportAssistant';
import { buildSupportTools } from './FNHandler';
import { db } from '@/db/db';
import { supportConversations, supportMessages } from '@/db/schemas/support';
import { eq, desc, and } from 'drizzle-orm';
import type {
	MemberLocation, SupportAssistant,
	SupportConversation, SupportTrigger,
	SupportMessage,
	MessageRole
} from '@/types';

export class ChatAIService {
	private botConfigService: SupportAssistantService;

	constructor() {
		this.botConfigService = new SupportAssistantService();
	}

	/**
	 * Generate AI response for member chat
	 */
	async generateResponse(
		conversation: SupportConversation,
		ml: MemberLocation,
		message: string,
	): Promise<SupportMessage> {
		const assistant = conversation.assistant;
		if (!assistant) {
			throw new Error('Assistant not found');
		}

		const member = ml.member;
		if (!member) {
			throw new Error('Member not found');
		}

		try {

			// Check for trigger matches
			const matchedTrigger = this.botConfigService.evaluateTriggers(
				message,
				assistant.triggers || []
			);


			// Save user message to database
			await this.saveMessage(conversation.id, message, 'user');

			// Build system prompt from bot config
			const systemPrompt = this.botConfigService.buildSystemPrompt(assistant, ml);

			// Get available tools
			const tools = buildSupportTools(assistant.availableTools);

			let response = '';

			if (matchedTrigger) {
				console.log(`🎯 Trigger activated: ${matchedTrigger.name}`);
				response = await this.handleTriggeredResponse(matchedTrigger, tools, member.id, assistant, conversation.id);
			} else {
				response = await this.handleGeneralResponse(
					message,
					tools,
					assistant,
					ml,
					systemPrompt,
					conversation.id
				);
			}

			// Save AI response to database
			const msg = await this.saveMessage(conversation.id, response, 'ai');

			if (!msg) {
				throw new Error('Failed to save AI response');
			}


			return msg;

		} catch (error) {
			console.error('💥 AI Chat Error:', error);

			// Still try to save error to conversation if possible
			if (conversation.id) {
				try {
					await this.saveMessage(
						conversation.id,
						"I encountered an error processing your request. Please try again or contact support.",
						'ai'
					);
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
		trigger: SupportTrigger,
		tools: Record<string, any>[],
		mid: string,
		assistant: SupportAssistant,
		conversationId: string
	): Promise<string> {
		let response = `🎯 Trigger "${trigger.name}" activated!\n\n`;

		// Execute trigger tool call
		if (trigger.toolCall?.name) {
			const tool = tools.find(t => t.name === trigger.toolCall.name);
			if (tool) {
				try {
					const context = {
						locationId: assistant.locationId,
						supportBotId: assistant.id,
						conversationId
					};
					const toolResult = await tool.invoke(
						{ memberId: mid, ...trigger.toolCall.args },
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
		message: string,
		tools: Record<string, any>[],
		assistant: SupportAssistant,
		ml: MemberLocation,
		systemPrompt: string,
		cid: string
	): Promise<string> {

		// For common queries, use direct tool calling without AI model
		const messageLower = message.toLowerCase();

		if (messageLower.includes('membership') || messageLower.includes('subscription')) {
			const tool = tools.find(t => t.name === 'get_member_status');
			if (tool) {
				return await tool.invoke({ mid: ml.member?.id }, {
					locationId: assistant.locationId,
					supportBotId: assistant.id
				});
			}
		}

		if (messageLower.includes('billing') || messageLower.includes('payment')) {
			const tool = tools.find(t => t.name === 'get_member_billing');
			if (tool) {
				return await tool.invoke({ mid: ml.member?.id }, {
					locationId: assistant.locationId,
					supportBotId: assistant.id
				});
			}
		}

		if (messageLower.includes('classes') || messageLower.includes('book')) {
			const tool = tools.find(t => t.name === 'get_member_bookable_sessions');
			if (tool) {
				return await tool.invoke({ mid: ml.member?.id }, {
					locationId: assistant.locationId,
					supportBotId: assistant.id
				});
			}
		}

		if (messageLower.includes('help') || messageLower.includes('issue') || messageLower.includes('problem')) {
			const tool = tools.find(t => t.name === 'create_support_ticket');
			if (tool) {
				return await tool.invoke({
					title: 'General Support Request',
					description: message,
					priority: 3
				}, {
					locationId: assistant.locationId,
					supportBotId: assistant.id,
					conversationId: cid
				});
			}
		}

		// TODO: Implement full AI model integration for complex conversations
		// const model = this.modelService.getModel(botConfig.model, {
		//   temperature: botConfig.temperature / 100,
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
		return `Hello ${ml.member?.firstName}! I'm your support assistant for ${ml.location?.name}. I can help you with:

• **"membership status"** - Check your current subscriptions and packages
• **"billing information"** - View your account and payment details  
• **"available classes"** - See what you can book with your membership
• **"help with [issue]"** - Create support tickets for any problems
• **General questions** - I'll connect you with our support team

What would you like to know about? (Powered by ${assistant.model.toUpperCase()})`;
	}

	/**
	 * Get conversation message history for AI context
	 */
	private async getConversationMessages(conversationId: string, limit: number = 20) {
		try {
			console.log(`📚 Getting conversation history for ${conversationId} (limit: ${limit})`);

			const messages = await db.query.supportMessages.findMany({
				where: eq(supportMessages.conversationId, conversationId),
				orderBy: [desc(supportMessages.created)],
				limit: Math.min(limit, 50),
			});

			// Return in chronological order for AI context
			const chronologicalMessages = messages.reverse().map(message => ({
				role: message.role === 'ai' ? 'assistant' : message.role === 'user' ? 'user' : 'system',
				content: message.content,
				timestamp: message.created.toISOString(),
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
					assistant: true
				}
			});

			if (!conversation) {
				throw new Error('Conversation not found or access denied');
			}

			// Get messages
			const messages = await db.query.supportMessages.findMany({
				where: eq(supportMessages.conversationId, conversationId),
				orderBy: [desc(supportMessages.created)],
				limit: 50,
			});

			// Serialize dates for API response
			const serializedMessages = messages.map((message) => ({
				...message,
				createdAt: message.created.toISOString(),
			}));

			return {
				conversation: {
					...conversation,
					createdAt: conversation.created.toISOString(),
					updatedAt: conversation.updated?.toISOString(),
					takenOverAt: conversation.takenOverAt?.toISOString(),
				},
				messages: serializedMessages.reverse()
			};

		} catch (error) {
			console.error("Error fetching conversation history:", error);
			throw error;
		}
	}




	private async saveMessage(conversationId: string, content: string, role: 'user' | 'ai') {
		const [savedMessage] = await db.insert(supportMessages).values({
			conversationId,
			content,
			role,
			channel: 'WebChat',
			metadata: {
				savedAt: new Date().toISOString(),
				source: 'api-chat'
			},
		}).returning();

		// Update conversation timestamp
		await db.update(supportConversations).set({
			updated: new Date(),
		}).where(eq(supportConversations.id, conversationId));

		return savedMessage;
	}
}
