import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '@/libs/client/supabase';
import { useSession } from './useSession';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Message } from '@/types/chats';

interface UseGroupChatOptions {
  chatId: string | null;
  fromUserId: string | null;      // The user sending
  enabled?: boolean;              // Whether to start the connection
}

export const useGroupChat = ({ 
  chatId, 
  fromUserId, 
  enabled = true
}: UseGroupChatOptions) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load messages for the current chat
  const loadMessages = useCallback(async (currentChatId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('messages')
        .select('*,sender:users!sender_id(image, name)')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });


      
      const mapped = data?.map((message) => {
        return {
          ...message,
          created: message.created_at,
          updated: message.updated_at,
        }
      }) || [];

      if (error) throw error;
      setMessages(mapped || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (
    content: string, 
    attachments?: any[]
  ) => {
    if (!chatId || !fromUserId) {
      throw new Error('Chat not initialized or sender not set');
    }

    try {
      // 1. Store message in database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: fromUserId,
          content,
          metadata: {
            image: session?.user?.image,
            name: session?.user?.name,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Manually broadcast to all connected clients via the channel
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: data,
        });
      }
      const mapped: Message = {
        ...data,
        sender: {
          id: fromUserId,
          image: session?.user?.image,
          name: session?.user?.name,
        },
        created: data.created_at
      }
      // Optimistically add to local state
      setMessages(prev => [...prev, mapped]);
      
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId]);

  // Initialize chat and set up realtime subscription
  useEffect(() => {
    if (!enabled || !session || !chatId || !fromUserId) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let mounted = true;

    const initializeChat = async () => {
      if (!mounted) return;

      // Set up realtime channel with Broadcast Replay
      const replayTimestamp = Date.now() - (10 * 60 * 1000); // Last 10 minutes

      channel = supabase.channel(`chat:${chatId}`, {
        config: {
          private: true, // Requires authentication
          broadcast: { 
            self: false, // Don't receive own messages via broadcast
            ack: false,
            // @ts-expect-error - replay is available in Supabase client 2.74.0+ but not yet in type definitions
            replay: {
              since: replayTimestamp,
              limit: 25 // Get up to 25 recent messages

            }
          }
        }
      });

      // Listen for new messages
      channel.on('broadcast', { event: 'new_message' }, async (payload) => {
        if (!mounted) return;
        const newMessage = payload.payload;
        
        // Check if this is a replayed message
        const isReplayed = payload.meta?.replayed;
        
        if (isReplayed) {
          let sender = null;

          const {data, error} = await supabase.from('users').select('image, name').eq('id', newMessage.sender_id).single();

          if (data) {
            sender = {
              id: newMessage.sender_id,
              image: data.image,
              name: data.name,
            }
          }

          // Add replayed messages to state, avoiding duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            const mapped: Message = {
              ...newMessage,
              sender,
              created: newMessage.created_at,
              updated: newMessage.updated_at,
            }
            return [...prev, mapped].sort(
              (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
            );
          });
        } else {
          let sender = null;

          const {data, error} = await supabase.from('users').select('image, name').eq('id', newMessage.sender_id).single();

          if (data) {
            sender = {
              id: newMessage.sender_id,
              image: data.image,
              name: data.name,
            }
          }

          // New message (not replayed)
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            const mapped: Message = {
              ...newMessage,
              sender,
              created: newMessage.created_at,
              updated: newMessage.updated_at,
            }
            return [...prev, mapped];
          });
        }
      });

      // Subscribe to the channel
      channel.subscribe(async (status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Load full message history after successful connection
          await loadMessages(chatId);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Failed to connect to chat');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Connection timed out');
        }
      });

      channelRef.current = channel;
    };

    initializeChat();

    // Cleanup
    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, session, chatId, fromUserId, loadMessages]);

  return {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};

