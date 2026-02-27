import type { UserFeed } from '@subtrees/types';
import supabase from './SupabaseService';
import { RealTimeEvents } from '@subtrees/constants/data';
/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastNewFeed(userIds: string[], feed: UserFeed): Promise<void> {


    try {

        await Promise.all(userIds.map(async (userId) => {
            const channel = supabase.createChannel(`feeds:${userId}`);
            await channel.send({
                type: 'broadcast',
                event: RealTimeEvents.feeds.NEW_FEED,
                payload: {
                    feed
                },
            });
            supabase.removeChannel(channel);
        }));

    } catch (error) {
        console.error('Error broadcasting message update:', error);
        throw error;
    }
}