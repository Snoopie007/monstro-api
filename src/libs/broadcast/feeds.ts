import type { UserFeed } from '@subtrees/types';
import supabase from './SupabaseService';
import { RealTimeEvents } from '@subtrees/constants/data';
/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastNewFeeds(newFeeds: UserFeed[]): Promise<void> {


    try {

        await Promise.all(newFeeds.map(async (feed) => {
            const channel = supabase.createChannel(`user:${feed.userId}`);
            await channel.httpSend(RealTimeEvents.feeds.NEW_FEED, feed);
            supabase.removeChannel(channel);
        }));

    } catch (error) {
        console.error('Error broadcasting message update:', error);
        throw error;
    }
}