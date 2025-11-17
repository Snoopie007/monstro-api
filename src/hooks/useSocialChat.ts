import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '@/libs/client/supabase';
import { useSession } from './useSession';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  fromMemberId: string | null;     // The member sending (or admin masquerading as)
  toMemberId: string | null;        // The member receiving
  locationId: string;               // Current location context
  enabled?: boolean;                // Whether to start the connection
}

export const useSocialChat = ({ 
  fromMemberId, 
  toMemberId,
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

  // Function to find or create a chat between two members
  const findOrCreateChat = useCallback(async () => {
    if (!fromMemberId || !toMemberId) {
      return null;
    }

    try {
      // First, check if a chat already exists between these two members
      const { data: existingChats, error: searchError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .in('member_id', [fromMemberId, toMemberId]);

      if (searchError) throw searchError;

      // Find a chat where both members are present
      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(c => c.chat_id);
        const chatCounts = chatIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find chat with exactly 2 members (both fromMember and toMember)
        const existingChatId = Object.entries(chatCounts)
          .find(([_, count]) => count === 2)?.[0];

        if (existingChatId) {
          // Verify it's a direct chat (only 2 members total)
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
          started_by: fromMemberId,
          name: null, // Direct chats don't need names
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both members to the chat
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, member_id: fromMemberId },
          { chat_id: newChat.id, member_id: toMemberId },
        ]);

      if (membersError) throw membersError;

      return newChat.id;
    } catch (err) {
      console.error('Error finding/creating chat:', err);
      setError('Failed to initialize chat');
      return null;
    }
  }, [fromMemberId, toMemberId]);

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
    attachments?: any[]
  ) => {
    if (!chatId || !fromMemberId) {
      throw new Error('Chat not initialized or sender not set');
    }

    try {
      // 1. Store message in database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: fromMemberId,
          content,
          attachments: attachments || [],
          read_by: [fromMemberId],
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

      // Optimistically add to local state
      setMessages(prev => [...prev, data]);
      
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromMemberId]);

  // Initialize chat and set up realtime subscription
  useEffect(() => {
    if (!enabled || !session || !fromMemberId || !toMemberId) {
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

      setChatId(foundChatId);

      // Set up realtime channel with Broadcast Replay
      const replayTimestamp = Date.now() - (10 * 60 * 1000); // Last 10 minutes

      channel = supabase.channel(`chat:${foundChatId}`, {
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

        const newMessage = payload.payload as Message;
        
        // Check if this is a replayed message
        const isReplayed = payload.meta?.replayed;
        
        if (isReplayed) {
          // Add replayed messages to state, avoiding duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        } else {
          // New message (not replayed)
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
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
  }, [enabled, session, fromMemberId, toMemberId, findOrCreateChat, loadMessages]);

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
