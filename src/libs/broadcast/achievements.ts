
import supabase from './SupabaseService';
import { RealTimeEvents } from '@subtrees/constants/data';
import type { Achievement } from '@subtrees/types';
/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastAchievement(userId: string, achievement: Achievement): Promise<void> {

    try {
        const channel = supabase.createChannel(`user:${userId}`);
        await channel.httpSend(RealTimeEvents.achievements.UNLOCKED, {
            badge: achievement.badge,
            name: achievement.name,
            description: achievement.description,
            points: achievement.points,
            locationId: achievement.locationId,
        });
        supabase.removeChannel(channel);

    } catch (error) {
        console.error('Error broadcasting message update:', error);
        throw error;
    }
}