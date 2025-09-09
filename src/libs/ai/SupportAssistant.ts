import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { supportAssistants } from '@/db/schemas/';
import { supportTriggers } from '@/db/schemas/support';
import type { MemberLocation, SupportAssistant, SupportPersona } from '@/types';


export interface MemberContext {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  memberSince: Date;
  locationName?: string;
}

export class SupportAssistantService {
  /**
   * Get support bot configuration for a location
   */
  async getSupportAssistant(lid: string): Promise<SupportAssistant> {

    const assistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, lid),
      with: {
        triggers: {
          where: eq(supportTriggers.isActive, true),
        },
      }

    });

    if (!assistant) {
      throw new Error(`Failed to get or create support bot for location ${lid}`);
    }

    console.log(`🔧 Found bot: ${assistant.name} with ${assistant.triggers.length} active triggers`);

    return assistant;
  }

  /**
   * Build AI system prompt from bot configuration
   */
  buildSystemPrompt(assistant: SupportAssistant, ml: MemberLocation): string {
    let prompt = assistant.prompt;

    const personaTraits = assistant.persona.personality || [];
    console.log('🟢 Assistant:', assistant);

    // Add persona information if available
    if (assistant.persona) {
      prompt += `\n\nPersona Instructions:
- Name: ${assistant.persona.name}
- Response Style: ${assistant.persona.responseStyle || ''}
- Personality Traits: ${personaTraits.join(', ')}`;
    }

    // Add member context
    if (ml) {
      prompt += `\n\nMember Context:
- Name: ${ml.member?.firstName} ${ml.member?.lastName || ''}
- Member ID: ${ml.member?.id}
- Email: ${ml.member?.email}
- Member since: ${ml.member?.created.toLocaleDateString()}`;

      if (ml.location?.name) {
        prompt += `\n- Location: ${ml.location?.name}`;
      }
    }

    // Add available tools information
    prompt += `\n\nAvailable Tools:
${assistant.availableTools.map((tool: any) => `- ${tool.name}: ${tool.description}`).join('\n')}`;

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


}
