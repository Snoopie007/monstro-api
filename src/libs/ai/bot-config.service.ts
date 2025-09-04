import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { supportBots, supportTriggers } from '@/db/schemas';

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
    
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, locationId),
      // TODO: Add persona relation when available
      // with: {
      //   persona: true,
      // }
    });

    if (!supportBot) {
      throw new Error(`No support bot configured for location ${locationId}`);
    }

    // Get active triggers separately to avoid relation issues
    const triggers = await db.query.supportTriggers.findMany({
      where: and(
        eq(supportTriggers.supportBotId, supportBot.id),
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
      ...supportBot,
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
    const bot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, locationId),
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
