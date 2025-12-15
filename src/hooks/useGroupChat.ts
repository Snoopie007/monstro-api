import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import { ReactionEmoji, Message, ReactionCount, Media } from '@/types';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './useSession';
import { UploadUrl } from '@/types/other';
import { uploadToS3 } from '@/libs/client/s3';

interface UseGroupChatOptions {
  chatId: string | null;
  fromUserId: string | null;      // The user sending
  enabled?: boolean;              // Whether to start the connection
}

// Helper to generate unique temp IDs for optimistic messages
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useGroupChat = ({
  chatId,
  fromUserId,
  enabled = true
}: UseGroupChatOptions) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
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
    if (!session?.user?.sbToken) {
      setError('No authentication token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const api = clientsideApiClient(session.user.sbToken);
      const messagesData = await api.get<Message[]>(
        `/protected/chats/${currentChatId}/messages`
      );
      
      setMessages(messagesData);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.sbToken]);

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

    const tempId = generateTempId();
    const hasFiles = files && files.length > 0;

    try {
      // STEP 1: Create optimistic message immediately if we have files
      if (hasFiles) {
        const tempMessage: Message = {
          id: tempId,
          chatId,
          senderId: fromUserId,
          content,
          metadata: {},
          created: new Date(),
          updated: null,
          sender: {
            id: fromUserId,
            name: session?.user?.name || 'You',
            image: session?.user?.image || null,
          } as any,
          media: [],
          reactions: [],
          // Optimistic fields
          progress: 0,
          pendingFiles: files,
          isOptimistic: true,
        };
        setOptimisticMessage(tempMessage);
      }

      let uploadedFiles: Record<string, any>[] = [];

      // STEP 2: Get presigned URLs and upload with progress tracking
      if (hasFiles) {
        const api = clientsideApiClient(session.user.sbToken);
        const presignedUrls = await api.post(`/protected/medias/presigned`, {
          chatId,
          files: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }) as UploadUrl[];

        // Track individual file progress for accurate overall calculation
        const fileProgresses = new Array(files.length).fill(0);

        const calculateOverallProgress = () => {
          if (files.length === 0) return 0;
          const total = fileProgresses.reduce((sum, p) => sum + Math.min(100, Math.max(0, p)), 0);
          return Math.min(100, Math.max(0, Math.round(total / files.length)));
        };

        // STEP 3: Upload files to S3 with progress tracking
        await Promise.all(
          files.map(async (file, index) => {
            const presignedUrl = presignedUrls[index];

            await uploadToS3(file, presignedUrl.uploadUrl, (progress) => {
              fileProgresses[index] = progress;
              const overallProgress = calculateOverallProgress();
              
              // Update optimistic message progress in real-time
              setOptimisticMessage(prev => 
                prev ? { ...prev, progress: overallProgress } : null
              );
            });

            uploadedFiles.push({
              fileName: presignedUrl.fileName,
              mimeType: presignedUrl.mimeType,
              fileSize: presignedUrl.fileSize,
              url: presignedUrl.publicUrl,
            });
          })
        );
      }

      // STEP 4: Send message to API with uploaded file metadata
      const api = clientsideApiClient(session.user.sbToken);
      const enrichedMessage = await api.post(`/protected/chats/${chatId}/messages`, {
        content,
        files: uploadedFiles,
      }) as any;

      // STEP 5: Clear optimistic message
      setOptimisticMessage(null);

      // STEP 6: Add real message to state
      const mapped: Message = {
        id: enrichedMessage.id,
        chatId: enrichedMessage.chatId,
        senderId: enrichedMessage.senderId,
        content: enrichedMessage.content,
        metadata: enrichedMessage.metadata,
        sender: enrichedMessage.sender,
        media: enrichedMessage.medias || [],
        created: enrichedMessage.created,
        updated: enrichedMessage.updated,
        reactions: [],
      };

      setMessages(prev => {
        if (prev.some(m => m.id === mapped.id)) return prev;
        return [...prev, mapped];
      });

      return enrichedMessage;
    } catch (err) {
      // Clear optimistic message on error
      setOptimisticMessage(null);
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId, session?.user?.sbToken, session?.user?.name]);

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
            self: false
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
          sender: enrichedMessage.sender,
          media: enrichedMessage.medias || [],
          created: enrichedMessage.created,
          updated: enrichedMessage.updated,
          reactions: enrichedMessage.reactions || [],
        };

        // New message (not replayed)
        setMessages((prev) => {
          if (prev.some(m => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
      });

      // Listen for message updates
      channel.on('broadcast', { event: 'message_updated' }, (payload) => {
        if (!mounted) return;
        const enrichedMessage = payload.payload?.message;

        if (!enrichedMessage?.id) {
          console.warn('Invalid updated message received:', enrichedMessage);
          return;
        }

        const mapped: Message = {
          id: enrichedMessage.id,
          chatId: enrichedMessage.chatId,
          senderId: enrichedMessage.senderId,
          content: enrichedMessage.content,
          metadata: enrichedMessage.metadata,
          sender: enrichedMessage.sender,
          media: enrichedMessage.medias || [],
          created: enrichedMessage.created,
          updated: enrichedMessage.updated,
          reactions: enrichedMessage.reactions || [],
        };

        // Update existing message
        setMessages((prev) => prev.map(m => m.id === mapped.id ? mapped : m));
      });

      // Listen for message deletions
      channel.on('broadcast', { event: 'message_deleted' }, (payload) => {
        if (!mounted) return;
        const messageId = payload.payload?.messageId;

        if (!messageId) {
          console.warn('Invalid deleted message ID received:', payload.payload);
          return;
        }

        // Remove message from local state
        setMessages((prev) => prev.filter(m => m.id !== messageId));
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

  // Edit a message
  const editMessage = useCallback(async (
    messageId: string,
    content: string
  ) => {
    if (!chatId || !session?.user?.sbToken) {
      throw new Error('Chat not initialized or no authentication token');
    }

    // Optimistically update local state
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        content: content.trim(),
        updated: new Date(),
      };
    }));

    try {
      const api = clientsideApiClient(session.user.sbToken);
      const updatedMessage = await api.put(`/protected/chats/${chatId}/messages/${messageId}`, {
        content: content.trim(),
      }) as any;

      // Update with server response
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          content: updatedMessage.content,
          updated: updatedMessage.updated,
        };
      }));

      return updatedMessage;
    } catch (err) {
      console.error('Error editing message:', err);
      // Revert optimistic update on error
      if (chatId) {
        loadMessages(chatId);
      }
      throw err;
    }
  }, [chatId, session?.user?.sbToken, loadMessages]);

  // Delete a message
  const deleteMessage = useCallback(async (
    messageId: string
  ) => {
    if (!chatId || !session?.user?.sbToken) {
      throw new Error('Chat not initialized or no authentication token');
    }

    // Optimistically remove from local state
    const messageToDelete = messages.find(m => m.id === messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      const api = clientsideApiClient(session.user.sbToken);
      await api.delete(`/protected/chats/${chatId}/messages/${messageId}`);

      // Message already removed optimistically
      return;
    } catch (err) {
      console.error('Error deleting message:', err);
      // Revert optimistic update on error
      if (messageToDelete) {
        setMessages(prev => [...prev, messageToDelete].sort((a, b) =>
          new Date(a.created).getTime() - new Date(b.created).getTime()
        ));
      } else if (chatId) {
        loadMessages(chatId);
      }
      throw err;
    }
  }, [chatId, session?.user?.sbToken, messages, loadMessages]);

  // Toggle reaction on a message (optimistic update)
  const toggleReaction = useCallback(async (
    messageId: string,
    emoji: ReactionEmoji
  ) => {
    if (!session?.user?.sbToken || !session?.user?.id) {
      throw new Error('No authentication token available');
    }

    const currentUserId = session.user.id;

    // Find the message and check if user already reacted with this emoji
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      r => r.display === emoji.value && r.userIds?.includes(currentUserId)
    );

    // Optimistically update local state
    setMessages(prev => prev.map((m: Message): Message => {
      if (m.id !== messageId) return m;

      const currentReactions = m.reactions || [];

      if (existingReaction) {
        // Remove user's reaction
        const updatedReactions = currentReactions.map(r => {
          if (r.display !== emoji.value) return r;
          return {
            ...r,
            count: r.count - 1,
            userIds: r.userIds.filter(id => id !== currentUserId),
            userNames: r.userNames.filter((_, idx) => r.userIds[idx] !== currentUserId)
          };
        }).filter(r => r.count > 0);

        return { ...m, reactions: updatedReactions };
      } else {
        // Add user's reaction
        const existingEmojiReaction = currentReactions.find(r => r.display === emoji.value);

        if (existingEmojiReaction) {
          return {
            ...m,
            reactions: currentReactions.map(r => {
              if (r.display !== emoji.value) return r;
              return {
                ...r,
                count: r.count + 1,
                userIds: [...r.userIds, currentUserId],
                userNames: [...r.userNames, session?.user?.name || 'You']
              };
            })
          };
        } else {
          return {
            ...m,
            reactions: [...currentReactions, {
              ownerType: 'message',
              ownerId: messageId,
              type: 'emoji',
              display: emoji.value,
              name: emoji.name,
              count: 1,
              userIds: [currentUserId],
              userNames: [session?.user?.name || 'You']
            }]
          };
        }
      }
    }));

    // Make API call - server handles toggle logic
    try {
      const response = await fetch(`/api/protected/reactions/message/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
      // Revert optimistic update on error by reloading
      if (chatId) {
        loadMessages(chatId);
      }
      throw err;
    }
  }, [messages, session?.user?.sbToken, session?.user?.name, chatId, loadMessages]);

  // Combine real messages with optimistic message for display
  const displayMessages = useMemo(() => {
    if (optimisticMessage) {
      return [...messages, optimisticMessage];
    }
    return messages;
  }, [messages, optimisticMessage]);

  return {
    messages: displayMessages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};

