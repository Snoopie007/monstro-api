import type { Message } from '@subtrees/types';
import supabase from './SupabaseService';
import { RealTimeEvents } from '@subtrees/constants/data';

/**
 * Broadcasts an enriched message to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The message to broadcast
 * @param inactiveUserIds - The IDs of the users not on the chat
 * @param activeUserIds - The IDs of the users on the chat
 */
export async function broadcastMessage(chatId: string, message: Message): Promise<void> {
	try {
		const channel = await supabase.createChannel(`chat:${chatId}`)
		channel?.httpSend(RealTimeEvents.chat.NEW_MESSAGE, { message });
		supabase.removeChannel(channel);
	} catch (error) {
		console.error('Error broadcasting message:', error);
		throw error;
	}
}


export async function broadcastMessageUnread(chatId: string, message: Message, userIds: string[]): Promise<void> {
	try {
		await Promise.all(userIds.map(async (userId) => {
			try {
				const c = supabase.createChannel(`user:${userId}`);
				console.log('Broadcasting message unread to user:', userId);
				await c.httpSend(RealTimeEvents.chats.NEW_MESSAGE, {
					chatId: chatId,
					message: message
				});
				supabase.removeChannel(c);
			} catch (err) {
				console.error(`Failed to broadcast to user ${userId}:`, err);
			}
		}));
	} catch (error) {
		console.error('Error broadcasting message unread:', error);
		throw error;
	}
}


/**
 * Broadcasts a message update to a Supabase Realtime channel
 * @param chatId - The chat ID to broadcast to
 * @param message - The updated message to broadcast
 */
export async function broadcastMessageUpdate(chatId: string, message: Message): Promise<void> {


	try {
		const channel = supabase.createChannel(`chat:${chatId}`);

		await channel.send({
			type: 'broadcast',
			event: RealTimeEvents.chat.UPDATED_MESSAGE,
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
	try {
		const channel = supabase.createChannel(`chat:${chatId}`);

		await channel.send({
			type: 'broadcast',
			event: RealTimeEvents.chat.DELETED_MESSAGE,
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
