import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import { Message } from '@/types/chats';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './useSession';

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

  // Create authenticated Supabase client like mobile does
  // This ensures the WebSocket connection has the token from the start
  const authenticatedSupabase = useMemo(() => {
    if (!session?.user?.sbToken) return null;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.user.sbToken}`
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 500,
          },
        },
      }
    );
  }, [session?.user?.sbToken]);

  // Load messages for the current chat
  const loadMessages = useCallback(async (currentChatId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*,sender:users!sender_id(image, name)')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch media for these messages
      const messageIds = messagesData?.map(m => m.id) || [];
      let mediaMap: Record<string, any[]> = {};
      
      // TODO: Move in api route instead -- loadMessages should be an api route
      if (messageIds.length > 0) {
        const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .select('*')
            .in('owner_id', messageIds)
            .eq('owner_type', 'message');
            
        if (!mediaError && mediaData) {
            mediaData.forEach(item => {
                if (!mediaMap[item.owner_id]) {
                    mediaMap[item.owner_id] = [];
                }
                mediaMap[item.owner_id].push({
                    id: item.id,
                    url: item.url,
                    thumbnailUrl: item.thumbnail_url,
                    fileName: item.file_name,
                    fileType: item.file_type,
                    mimeType: item.mime_type,
                    altText: item.alt_text
                });
            });
        }
      }

      const mapped = messagesData?.map((message) => {
        return {
          ...message,
          chatId: message.chat_id,
          senderId: message.sender_id,
          readBy: message.read_by,
          created: message.created_at,
          updated: message.updated_at,
          media: mediaMap[message.id] || []
        }
      }) || [];

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
      // The API saves the message and broadcasts it to other clients
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

    if (!enabled || !session || !chatId || !fromUserId || !authenticatedSupabase) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let mounted = true;

    const initializeChat = async () => {
      if (!mounted || !authenticatedSupabase) return;
      
      if (session?.user?.sbToken) {
        // Set auth token for realtime (like mobile does)
        await authenticatedSupabase.realtime.setAuth(session.user.sbToken);
      } else {
        console.error('No sbToken available - cannot authenticate realtime');
        return;
      }
      
      loadMessages(chatId);
      // Use authenticated client for realtime
      channel = authenticatedSupabase.channel(`chat:${chatId}`, {
        config: {
          private: true, // Requires authentication
          broadcast: { 
            ack: false,
          }
        }
      });

      // Listen for new messages
      channel.on('broadcast', { event: 'new_message' }, (payload) => {
        if (!mounted) return;
        // The message is nested: payload.payload.message
        const enrichedMessage = payload.payload?.message;
        
        // Skip if no valid message
        if (!enrichedMessage?.id) {
          console.warn('Invalid message received:', enrichedMessage);
          return;
        }
        
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
        
        // New message (not replayed)
        setMessages((prev) => {
          if (prev.some(m => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
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
      if (channel && authenticatedSupabase) {
        channel.unsubscribe();
        authenticatedSupabase.removeChannel(channel);
      }
    };
  }, [enabled, session, chatId, fromUserId, loadMessages, authenticatedSupabase]);

  return {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};

