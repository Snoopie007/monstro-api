
import supabase from './SupabaseService';
import { RealTimeEvents } from '@subtrees/constants/data';
import type { Achievement } from '@subtrees/types';
/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastNewFeed(userIds: string[], data: Achievement): Promise<void> {

    try {

        await Promise.all(userIds.map(async (userId) => {
            const channel = supabase.createChannel(`user:${userId}`);
            await channel.send({
                type: 'broadcast',
                event: RealTimeEvents.achievements.UNLOCKED,
                payload: {
                    badge: data.badge,
                    name: data.name,
                    description: data.description,
                    points: data.points,

                },
            });
            supabase.removeChannel(channel);
        }));

    } catch (error) {
        console.error('Error broadcasting message update:', error);
        throw error;
    }
}