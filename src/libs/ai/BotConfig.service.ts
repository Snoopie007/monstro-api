import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { supportAssistants } from '@/db/schemas/';
import { DEFAULT_SUPPORT_TOOLS } from '@/libs/ai/Tools';
import { supportTriggers } from '@/db/schemas/support';

export interface BotConfig {
  id: string;
  locationId: string;
  name: string;
  prompt: string;
  temperature: number;
  initialMessage: string;
  model: string;
  status: string;
  availableTools: any[];
  persona?: any;
  triggers: any[];
}

export interface MemberContext {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  memberSince: Date;
  locationName?: string;
}

export class BotConfigService {
  /**
   * Get support bot configuration for a location
   */
  async getBotConfig(locationId: string): Promise<BotConfig> {
    console.log(`🔧 Getting bot config for location: ${locationId}`);

    let supportBot = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, locationId),
      // TODO: Add persona relation when available
      // with: {
      //   persona: true,
      // }
    });

    // Fallback: Auto-create support bot for existing locations that don't have one
    // (New locations should get bots created during location creation)
    if (!supportBot) {
      console.log(`🔄 Fallback: Creating bot for existing location ${locationId} without support bot...`);

      const [newBot] = await db.insert(supportAssistants).values({
        locationId,
        name: 'Support Bot',
        prompt: 'You are a helpful customer support assistant. You have access to member information tools to help with subscriptions, billing, and bookable sessions. You can also create support tickets and escalate to human agents when needed.',
        temperature: 0,
        initialMessage: 'Hi! I\'m here to help you. I can assist with your membership status, billing questions, available classes, and any other support needs. What can I help you with today?',
        model: 'GPT',
        status: 'Draft',
        availableTools: DEFAULT_SUPPORT_TOOLS,
      }).returning();

      supportBot = newBot;
    }

    // Ensure supportBot exists (TypeScript guard)
    if (!supportBot || !supportBot.id) {
      throw new Error(`Failed to get or create support bot for location ${locationId}`);
    }

    // Get active triggers separately to avoid relation issues
    const triggers = await db.query.supportTriggers.findMany({
      where: and(
        eq(supportTriggers.supportAssistantId, supportBot.id),
        eq(supportTriggers.isActive, true)
      )
    });

    // TODO: Uncomment when ready for production
    // // Only use active bots for member interactions
    // if (supportBot.status !== 'Active') {
    //   throw new Error(`Support bot is not active for location ${locationId}`);
    // }

    console.log(`🔧 Found bot: ${supportBot.name} with ${triggers.length} active triggers`);

    return {
      id: supportBot.id,
      locationId: supportBot.locationId,
      name: supportBot.name,
      prompt: supportBot.prompt,
      temperature: supportBot.temperature,
      initialMessage: supportBot.initialMessage,
      model: supportBot.model,
      status: supportBot.status,
      availableTools: supportBot.availableTools,
      persona: undefined, // TODO: Add when persona relation is available
      triggers
    };
  }

  /**
   * Build AI system prompt from bot configuration
   */
  buildSystemPrompt(supportBot: BotConfig, memberContext: MemberContext): string {
    let prompt = supportBot.prompt;

    // Add persona information if available
    if (supportBot.persona) {
      prompt += `\n\nPersona Instructions:
- Name: ${supportBot.persona.name}
- Response Style: ${supportBot.persona.responseStyle}
- Personality Traits: ${supportBot.persona.personalityTraits.join(', ')}`;
    }

    // Add member context
    if (memberContext) {
      prompt += `\n\nMember Context:
- Name: ${memberContext.firstName} ${memberContext.lastName || ''}
- Member ID: ${memberContext.id}
- Email: ${memberContext.email}
- Member since: ${memberContext.memberSince.toLocaleDateString()}`;

      if (memberContext.locationName) {
        prompt += `\n- Location: ${memberContext.locationName}`;
      }
    }

    // Add available tools information
    prompt += `\n\nAvailable Tools:
${supportBot.availableTools.map((tool: any) => `- ${tool.name}: ${tool.description}`).join('\n')}`;

    prompt += `\n\nInstructions:
- Be helpful and professional
- Use the persona's response style if available  
- Use available tools when appropriate to help the customer
- Create support tickets for issues that need tracking
- Offer to escalate to human agent when needed
- Always provide accurate information based on member data`;

    return prompt;
  }

  /**
   * Evaluate triggers against user message
   */
  evaluateTriggers(message: string, triggers: any[]): any | null {
    const messageLower = message.toLowerCase();

    for (const trigger of triggers) {
      for (const phrase of trigger.triggerPhrases) {
        if (messageLower.includes(phrase.toLowerCase())) {
          console.log(`🎯 Trigger activated: ${trigger.name} for phrase: "${phrase}"`);
          return trigger;
        }
      }
    }

    return null;
  }

  /**
   * Get bot status for validation
   */
  async getBotStatus(locationId: string): Promise<string> {
    const bot = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, locationId),
      columns: { status: true }
    });

    return bot?.status || 'Draft';
  }

  /**
   * Check if bot is active and ready for member interactions
   */
  async isBotActive(locationId: string): Promise<boolean> {
    const status = await this.getBotStatus(locationId);
    // TODO: Uncomment for production validation
    // return status === 'Active';

    // For testing, allow Draft and Active bots
    return ['Draft', 'Active'].includes(status);
  }
}
