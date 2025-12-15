import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './useSession';
import { Message, Media, ReactionCount, ReactionEmoji, UploadUrl } from '@/types';
import { uploadToS3 } from '@/libs/client/s3';



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
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to generate unique temp IDs for optimistic messages
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Function to find an existing location-based group chat for a member
  // Returns null if no chat exists yet (chat will be created on first message)
  const findChat = useCallback(async () => {
    if (!fromUserId || !toUserId || !locationId || !session?.user?.sbToken) {
      return null;
    }

    try {
      const api = clientsideApiClient(session.user.sbToken);
      const result = await api.get<{ chatId: string | null }>(
        `/x/loc/${locationId}/chat/member`,
        { memberId: toUserId }
      );
      return result.chatId;
    } catch (err) {
      console.error('Error finding location chat:', err);
      setError('Failed to load chat');
      return null;
    }
  }, [fromUserId, toUserId, locationId, session?.user?.sbToken]);

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

  // Send a message - creates chat on first message if needed
  const sendMessage = useCallback(async (
    content: string,
    files?: File[]
  ) => {
    if (!fromUserId || !toUserId || !locationId) {
      throw new Error('Missing required user or location info');
    }

    if (!session?.user?.sbToken) {
      throw new Error('No authentication token available');
    }

    let currentChatId = chatId;
    const tempId = generateTempId();
    const hasFiles = files && files.length > 0;

    try {
      // If no chat exists yet, create it via API
      if (!currentChatId) {
        const api = clientsideApiClient(session.user.sbToken);
        const chatResult = await api.post(`/x/loc/${locationId}/chat/member`, {
          memberId: toUserId,
        }) as { chatId: string; created?: boolean };

        currentChatId = chatResult.chatId;
        setChatId(currentChatId);
      }

      // STEP 1: Create optimistic message immediately if we have files
      if (hasFiles) {
        const tempMessage: Message = {
          id: tempId,
          chatId: currentChatId,
          senderId: fromUserId,
          content,
          metadata: {},
          created: new Date(),
          updated: null,
          sender: {
            id: fromUserId,
            name: session?.user?.name || 'You',
            image: session?.user?.image || null,
            email: session?.user?.email || '',
            emailVerified: null,
            password: null,
            created: new Date(),
            updated: null,
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
          chatId: currentChatId,
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
              
              // Also update the uploadProgress state (for backward compatibility)
              setUploadProgress(prev => ({ ...prev, [index]: progress }));
            });

            uploadedFiles.push({
              fileName: presignedUrl.fileName,
              mimeType: presignedUrl.mimeType,
              fileSize: presignedUrl.fileSize,
              url: presignedUrl.publicUrl,
            });
          })
        );

        // Clear file progress tracking
        setUploadProgress({});
      }

      // STEP 4: Send message to API with uploaded file metadata
      const api = clientsideApiClient(session.user.sbToken);
      const enrichedMessage = await api.post(`/protected/chats/${currentChatId}/messages`, {
        content,
        files: uploadedFiles,
      }) as any;

      // STEP 5: Clear optimistic message
      setOptimisticMessage(null);

      // STEP 6: Add real message to state
      const message: Message = {
        id: enrichedMessage.id,
        chatId: enrichedMessage.chatId,
        senderId: enrichedMessage.senderId,
        content: enrichedMessage.content,
        metadata: enrichedMessage.metadata,
        created: enrichedMessage.created,
        updated: enrichedMessage.updated,
        sender: enrichedMessage.sender || null,
        media: enrichedMessage.medias || [],
        reactions: [],
      };

      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      return enrichedMessage;
    } catch (err) {
      // Clear optimistic message on error
      setOptimisticMessage(null);
      setUploadProgress({});
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId, toUserId, locationId, session?.user?.sbToken, session?.user?.name, session?.user?.image, session?.user?.email]);

  // Initialize chat and set up realtime subscription
  useEffect(() => {
    if (!enabled || !session || !fromUserId || !toUserId || !locationId) {
      setChatId(null);
      setMessages([]);
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let mounted = true;

    const initializeChat = async () => {
      setIsLoading(true);

      // Find existing chat (don't create - that happens on first message)
      const foundChatId = await findChat();

      if (!mounted) return;

      setIsLoading(false);

      // No chat exists yet - this is fine, user can send first message to create it
      if (!foundChatId) {
        setChatId(null);
        setMessages([]);
        setIsConnected(true); // Mark as "ready" so input is enabled
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
            self: false,
          }
        }
      });

      // Listen for new messages
      channel.on('broadcast', { event: 'new_message' }, (payload) => {
        if (!mounted) return;

        const enrichedMessage = payload.payload?.message || payload.payload;

        // Messages are now enriched by the API with sender and media data
        const message: Message = {
          id: enrichedMessage.id,
          chatId: enrichedMessage.chatId,
          senderId: enrichedMessage.senderId,
          content: enrichedMessage.content,
          metadata: enrichedMessage.metadata,
          created: enrichedMessage.created,
          updated: enrichedMessage.updated,
          sender: enrichedMessage.sender || null,
          media: enrichedMessage.medias || [],
          reactions: enrichedMessage.reactions || [],
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
  }, [enabled, session, fromUserId, toUserId, locationId, findChat, loadMessages]);

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
              userNames: [session?.user?.name || ''],
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
  }, [messages, session?.user?.sbToken, session?.user?.name, session?.user?.id, chatId, loadMessages]);

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
    chatId,
    error,
    uploadProgress,
    sendMessage,
    toggleReaction,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};
