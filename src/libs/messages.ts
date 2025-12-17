import { db } from '@/db/db';
import { chatMembers } from '@/db/schemas';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import type { Message } from '@/types';



/**
 * Broadcasts an enriched message to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The message to broadcast
 */
export async function broadcastMessage(chatId: string, message: Message): Promise<void> {
  const supabaseUrl = Bun.env.SUPABASE_URL;
  const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
      params: {
        eventsPerSecond: 100,
      },
    },
  });

  try {
    // Broadcast to the specific chat channel
    const channel = supabase.channel(`chat:${chatId}`, {
      config: {
        private: true, // Requires authentication
        broadcast: {
          ack: false,
        }
      }
    });

    // Broadcast the enriched message
    await channel.httpSend(
      'new_message',
      { message },
    );

    supabase.removeChannel(channel);

    // Fetch members of this chat
    const participants = await db.query.chatMembers.findMany({
      where: eq(chatMembers.chatId, chatId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          },
        },
      }
    });

    // Broadcast "chat_updated" to each user's personal channel
    await Promise.all(participants.map(async (member) => {
      try {
        const userChannel = supabase.channel(`chats:${member.user.id}`, {
          config: {
            private: true, // Requires authentication
            broadcast: {
              ack: false,
            }
          }
        });
        await userChannel.httpSend(
          'chat_updated',
          { message },
        );
        supabase.removeChannel(userChannel);
      } catch (err) {
        console.error(`Failed to broadcast to user ${member.user.id}:`, err);
      }
    }));
  } catch (error) {
    console.error('Error broadcasting message:', error);
    throw error;
  }
}

/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastMessageUpdate(chatId: string, message: Message): Promise<void> {
  const supabaseUrl = Bun.env.SUPABASE_URL;
  const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
      params: {
        eventsPerSecond: 100,
      },
    },
  });

  try {
    const channel = supabase.channel(`chat:${chatId}`, {
      config: {
        private: true,
        broadcast: {
          ack: false,
        }
      }
    });

    await channel.send({
      type: 'broadcast',
      event: 'message_updated',
      payload: {
        message
      },
    });

    supabase.removeChannel(channel);
  } catch (error) {
    console.error('Error broadcasting message update:', error);
    throw error;
  }
}

/**
 * Broadcasts a message deletion to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param messageId - The ID of the deleted message
 */
export async function broadcastMessageDelete(chatId: string, messageId: string): Promise<void> {
  const supabaseUrl = Bun.env.SUPABASE_URL;
  const supabaseServiceKey = Bun.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
      params: {
        eventsPerSecond: 100,
      },
    },
  });

  try {
    const channel = supabase.channel(`chat:${chatId}`, {
      config: {
        private: true,
        broadcast: {
          ack: false,
        }
      }
    });

    await channel.send({
      type: 'broadcast',
      event: 'message_deleted',
      payload: {
        messageId
      },
    });

    supabase.removeChannel(channel);
  } catch (error) {
    console.error('Error broadcasting message deletion:', error);
    throw error;
  }
}
