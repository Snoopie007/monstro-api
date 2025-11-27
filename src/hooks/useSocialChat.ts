import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './useSession';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  attachments?: any[];
  read_by?: string[];
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

interface UseSocialChatOptions {
  fromUserId: string | null;        // The user sending (or admin masquerading as)
  toUserId: string | null;          // The user receiving
  locationId: string;               // Current location context
  enabled?: boolean;                // Whether to start the connection
}

export const useSocialChat = ({ 
  fromUserId, 
  toUserId,
  locationId,
  enabled = true
}: UseSocialChatOptions) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to find or create a chat between two users
  const findOrCreateChat = useCallback(async () => {
    if (!fromUserId || !toUserId) {
      return null;
    }

    try {
      // First, check if a chat already exists between these two users
      const { data: existingChats, error: searchError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .in('user_id', [fromUserId, toUserId]);

      if (searchError) throw searchError;

      // Find a chat where both users are present
      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(c => c.chat_id);
        const chatCounts = chatIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find chat with exactly 2 users (both fromUser and toUser)
        const existingChatId = Object.entries(chatCounts)
          .find(([_, count]) => count === 2)?.[0];

        if (existingChatId) {
          // Verify it's a direct chat (only 2 users total)
          const { count } = await supabase
            .from('chat_members')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', existingChatId);

          if (count === 2) {
            return existingChatId;
          }
        }
      }

      // No existing chat found, create a new one
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          started_by: fromUserId,
          name: null, // Direct chats don't need names
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both users to the chat
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: fromUserId },
          { chat_id: newChat.id, user_id: toUserId },
        ]);

      if (membersError) throw membersError;

      return newChat.id;
    } catch (err) {
      console.error('Error finding/creating chat:', err);
      setError('Failed to initialize chat');
      return null;
    }
  }, [fromUserId, toUserId]);

  // Load messages for the current chat
  const loadMessages = useCallback(async (currentChatId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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

      // Call API endpoint to send message
      // The API will upload files to S3, save to media table, and broadcast enriched message
      // Use API client with the Supabase token from session
      const api = clientsideApiClient(session.user.sbToken);
      const enrichedMessage = await api.post(`/protected/chats/${chatId}/messages`, formData) as any;
      
      // Since we have self: false, we won't receive our own messages via broadcast
      // So we need to manually add it to the local state
      const message: Message = {
        id: enrichedMessage.id,
        chat_id: enrichedMessage.chatId,
        sender_id: enrichedMessage.senderId,
        content: enrichedMessage.content,
        attachments: enrichedMessage.media || [],
        read_by: enrichedMessage.metadata?.read_by || [],
        metadata: enrichedMessage.metadata,
        created_at: enrichedMessage.created,
        updated_at: enrichedMessage.updated,
      };

      setMessages(prev => [...prev, message]);
      
      return enrichedMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId, session?.user?.sbToken]);

  // Initialize chat and set up realtime subscription
  useEffect(() => {
    if (!enabled || !session || !fromUserId || !toUserId) {
      setChatId(null);
      setMessages([]);
      setIsConnected(false);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let mounted = true;

    const initializeChat = async () => {
      // Find or create the chat
      const foundChatId = await findOrCreateChat();
      console.log('foundChatId', foundChatId);
      if (!mounted || !foundChatId) {
        return;
      }

      // Set auth token for private channels
      if (session?.user?.sbToken) {
        supabase.realtime.setAuth(session.user.sbToken);
      } 
      setChatId(foundChatId);

      channel = supabase.channel(`chat:${foundChatId}`, {
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

        const enrichedMessage = payload.payload
        
        // Messages are now enriched by the API with sender and media data
        const message: Message = {
          id: enrichedMessage.id,
          chat_id: enrichedMessage.chatId,
          sender_id: enrichedMessage.senderId,
          content: enrichedMessage.content,
          attachments: enrichedMessage.media || [],
          read_by: enrichedMessage.metadata?.read_by || [],
          metadata: enrichedMessage.metadata,
          created_at: enrichedMessage.created,
          updated_at: enrichedMessage.updated,
        };
        // New message (not replayed)
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      // Subscribe to the channel
      channel.subscribe(async (status) => {
        if (!mounted) return;

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Load full message history after successful connection
          await loadMessages(foundChatId);
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
  }, [enabled, session, fromUserId, toUserId, findOrCreateChat, loadMessages]);

  return {
    messages,
    isConnected,
    isLoading,
    chatId,
    error,
    sendMessage,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};
