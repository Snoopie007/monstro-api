import type { SupportConversation, SupportMessage } from '@subtrees/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Interface for support message broadcast payload
 */
export interface SupportMessagePayload {
  id: string;
  conversationId: string;
  content: string;
  role: string;
  channel: string;
  agentId?: string | null;
  agentName?: string | null;
  metadata: Record<string, any>;
  created: Date;
}

/**
 * Interface for support conversation broadcast payload
 */
export interface SupportConversationPayload {
  id: string;
  supportAssistantId: string;
  locationId: string;
  memberId: string;
  category?: string | null;
  isVendorActive: boolean;
  status: string;
  title: string;
  metadata: Record<string, any>;
  created: Date;
  updated?: Date | null;
  takenOverAt?: Date | null;
  description?: string | null;
  priority: number;
}

/**
 * Creates a Supabase client for broadcasting
 */
function getSupabaseClient() {
  const supabaseUrl = Bun.env.SUPABASE_URL;
  const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
      params: {
        eventsPerSecond: 100,
      },
    },
  });
}

/**
 * Broadcasts a support message to the conversation channel
 * @param conversationId - The conversation ID to broadcast to
 * @param message - The message to broadcast
 */
export async function broadcastSupportMessage(
  conversationId: string,
  message: SupportMessagePayload
): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    // Broadcast to the specific conversation channel
    const channel = supabase.channel(`support:${conversationId}`, {
      config: {
        private: true,
        broadcast: {
          ack: false,
        },
      },
    });

    // Determine event type based on message role
    const eventType = message.role === 'system' ? 'system_message' : 'new_message';

    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: {
        message,
      },
    });

    supabase.removeChannel(channel);

    console.log(`📤 Broadcasted support message to conversation ${conversationId}`);
  } catch (error) {
    console.error('Error broadcasting support message:', error);
    throw error;
  }
}

/**
 * Broadcasts conversation updates to the location-level channel
 * @param locationId - The location ID to broadcast to
 * @param conversation - The conversation data to broadcast
 * @param event - The event type: 'conversation_updated' or 'conversation_inserted'
 */
export async function broadcastSupportConversation(
  locationId: string,
  conversation: SupportConversationPayload,
  event: 'conversation_updated' | 'conversation_inserted'
): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    const channel = supabase.channel(`support:${locationId}`, {
      config: {
        private: true,
        broadcast: {
          ack: false,
        },
      },
    });

    await channel.send({
      type: 'broadcast',
      event,
      payload: {
        conversation,
      },
    });

    supabase.removeChannel(channel);

    console.log(`📤 Broadcasted ${event} to location ${locationId}`);
  } catch (error) {
    console.error('Error broadcasting support conversation:', error);
    throw error;
  }
}

/**
 * Helper to format a support message for broadcasting
 */
export function formatSupportMessagePayload(message: SupportMessage): SupportMessagePayload {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    role: message.role,
    channel: message.channel,
    agentId: message.agentId,
    agentName: message.agentName,
    metadata: message.metadata || {},
    created: message.created,
  };
}

/**
 * Helper to format a support conversation for broadcasting
 */
export function formatSupportConversationPayload(conversation: SupportConversation): SupportConversationPayload {
  return {
    id: conversation.id,
    supportAssistantId: conversation.supportAssistantId,
    locationId: conversation.locationId,
    memberId: conversation.memberId,
    category: conversation.category,
    isVendorActive: conversation.isVendorActive ?? false,
    status: conversation.status,
    title: conversation.title,
    metadata: conversation.metadata || {},
    created: conversation.created,
    updated: conversation.updated,
    takenOverAt: conversation.takenOverAt,
    description: conversation.description,
    priority: conversation.priority,
  };
}

