import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '@/libs/client/supabase';
import { useSession } from './useSession';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Message } from '@/types/chats';
import { clientsideApiClient } from '@/libs/api/client';

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
          chatId: message.chat_id,
          senderId: message.sender_id,
          readBy: message.read_by,
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
    files?: File[]
  ) => {
    if (!chatId || !fromUserId) {
      throw new Error('Chat not initialized or sender not set');
    }

    if (!session?.user?.sbToken) {
      throw new Error('No authentication token available');
    }

    try {
      // Build FormData with message content and files
      const formData = new FormData();
      formData.append('content', content);
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }
      
      // Use API client with the Supabase token from session
      const api = clientsideApiClient(session.user.sbToken);
      const enrichedMessage = await api.post(`/protected/chats/${chatId}/messages`, formData) as any;
      
      // Since we have self: false, we won't receive our own messages via broadcast
      // So we need to manually add it to the local state
      const mapped: Message = {
        id: enrichedMessage.id,
        chatId: enrichedMessage.chatId,
        senderId: enrichedMessage.senderId,
        content: enrichedMessage.content,
        metadata: enrichedMessage.metadata,
        attachments: enrichedMessage.attachments || [],
        readBy: enrichedMessage.metadata?.readBy || [],
        sender: enrichedMessage.sender,
        media: enrichedMessage.media,
        created: enrichedMessage.created,
        updated: enrichedMessage.updated,
      };

      setMessages(prev => [...prev, mapped]);
      
      return enrichedMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId, session?.user?.sbToken]);

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
      loadMessages(chatId);
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
      channel.on('broadcast', { event: 'new_message' }, (payload) => {
        if (!mounted) return;
        const enrichedMessage = payload.payload;
        
        // Check if this is a replayed message
        const isReplayed = payload.meta?.replayed;
        
        // Messages are now enriched by the API with sender and media data
        const mapped: Message = {
          id: enrichedMessage.id,
          chatId: enrichedMessage.chatId,
          senderId: enrichedMessage.senderId,
          content: enrichedMessage.content,
          metadata: enrichedMessage.metadata,
          attachments: enrichedMessage.attachments || [],
          readBy: enrichedMessage.metadata?.readBy || [],
          sender: enrichedMessage.sender,
          media: enrichedMessage.media,
          created: enrichedMessage.created,
          updated: enrichedMessage.updated,
        };
        
        if (isReplayed) {
          // Add replayed messages to state, avoiding duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === mapped.id)) return prev;
            return [...prev, mapped].sort(
              (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
            );
          });
        } else {
          // New message (not replayed)
          setMessages((prev) => {
            if (prev.some(m => m.id === mapped.id)) return prev;
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

