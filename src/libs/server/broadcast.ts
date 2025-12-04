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
 * Creates a Supabase client with service role key for server-side broadcasting
 */
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration for broadcasting');
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
  const supabase = getSupabaseServiceClient();

  try {
    console.log('📡 Broadcasting support message:', { conversationId, messageId: message.id, role: message.role });
    
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

    console.log(`📤 Sending broadcast with event: ${eventType}`);
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: {
        message,
      },
    });

    console.log('✅ Broadcast sent successfully');
    supabase.removeChannel(channel);
  } catch (error) {
    console.error('❌ Error broadcasting support message:', error);
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
  const supabase = getSupabaseServiceClient();

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

