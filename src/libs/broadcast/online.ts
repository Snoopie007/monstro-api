import supabase from './SupabaseService';
import { addOnlineUser, removeOnlineUser } from '@/state';
export function startOnlineChannel() {
    const channel = supabase.createChannel('online', 'system');
    channel.on('presence', { event: 'join' }, ({ key }) => {
        console.log(`[DEBUG] ${key} joined online channel`);
        addOnlineUser(key);
    });
    channel.on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`[DEBUG] ${key} left online channel`);
        removeOnlineUser(key);
    });
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('[DEBUG] Online channel subscribed');
        }
    });
    return channel;
}