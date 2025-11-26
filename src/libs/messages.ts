import { db } from '@/db/db';
import { chatMembers, messages } from '@/db/schemas';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

interface EnrichedMessage {
  id: string;
  chatId: string;
  senderId: string | null;
  content: string;
  metadata: Record<string, any>;
  created: Date;
  updated: Date | null;
  sender?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  media?: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    fileName: string;
    fileType: string;
    mimeType: string | null;
    altText: string | null;
  }>;
}

/**
 * Enriches a message with media attachments and sender information
 * @param messageId - The ID of the message to enrich
 * @returns The enriched message with media and sender data
 */
export async function enrichMessage(messageId: string): Promise<EnrichedMessage | null> {
  try {
    // Fetch the message with sender information and media
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!message) {
      return null;
    }

    // Fetch associated media
    const mediaFiles = await db.query.media.findMany({
      where: (media, { and, eq }) =>
        and(
          eq(media.ownerId, messageId),
          eq(media.ownerType, 'message')
        ),
      columns: {
        id: true,
        url: true,
        thumbnailUrl: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        altText: true,
      },
    });

    // Build enriched message
    const enrichedMessage: EnrichedMessage = {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      metadata: message.metadata || {},
      created: message.created,
      updated: message.updated,
      sender: message.sender ? {
        id: message.sender.id,
        name: message.sender.name,
        image: message.sender.image,
      } : null,
      media: mediaFiles.map(m => ({
        id: m.id,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        fileName: m.fileName,
        fileType: m.fileType,
        mimeType: m.mimeType,
        altText: m.altText,
      })),
    };

    return enrichedMessage;
  } catch (error) {
    console.error('Error enriching message:', error);
    throw error;
  }
}

/**
 * Broadcasts an enriched message to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param enrichedMessage - The enriched message to broadcast
 */
export async function broadcastMessage(chatId: string, enrichedMessage: EnrichedMessage): Promise<void> {
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
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: {
        message: enrichedMessage
      },
    });

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
        await userChannel.send({
          type: 'broadcast',
          event: 'chat_updated',
          payload: {
            message: enrichedMessage,
          },
        });
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
