import { clientsideApiClient } from '@/libs/api/client';
import { uploadToS3 } from '@/libs/client/s3';
import { Message } from '@subtrees/types/chat';
import {ReactionEmoji} from '@subtrees/types/reactions';
import { UploadUrl } from '@subtrees/types/other';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './useSession';

// ============== Types ==============

type ChatMode =
  | { type: 'direct'; chatId: string }
  | { type: 'social'; fromUserId: string; toUserId: string; locationId: string };

interface UseChatOptions {
  mode: ChatMode | null;
  enabled?: boolean;
  enablePresence?: boolean;
}

interface UseChatReturn {
  messages: Message[];
  chatId: string | null;
  isConnected: boolean;
  onlineUsers: string[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, files?: File[]) => Promise<Message>;
  editMessage: (messageId: string, content: string) => Promise<Message>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: ReactionEmoji) => Promise<void>;
  refresh: () => Promise<void>;
}

// ============== Helper ==============

const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============== Hook ==============

export const useChat = ({ mode, enabled = true, enablePresence = false }: UseChatOptions): UseChatReturn => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // ============== State ==============

  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(null);
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ============== Derived Values ==============

  // Extract stable primitive values from mode for dependency comparison
  const modeType = mode?.type ?? null;
  const directChatId = mode?.type === 'direct' ? mode.chatId : null;
  const socialFromUserId = mode?.type === 'social' ? mode.fromUserId : null;
  const socialToUserId = mode?.type === 'social' ? mode.toUserId : null;
  const socialLocationId = mode?.type === 'social' ? mode.locationId : null;

  // ============== Memos ==============

  const supabaseClient = useMemo(() => {
    if (!session?.user?.sbToken) return null;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${session.user.sbToken}` },
        },
        realtime: {
          params: { eventsPerSecond: 500 },
        },
      }
    );
  }, [session?.user?.sbToken]);

  const displayMessages = useMemo(() =>
    optimisticMessage ? [...messages, optimisticMessage] : messages,
    [messages, optimisticMessage]
  );

  // ============== Operations ==============

  const findChat = useCallback(async (): Promise<string | null> => {
    if (modeType !== 'social' || !session?.user?.sbToken || !socialLocationId || !socialToUserId) {
      return null;
    }

    try {
      const api = clientsideApiClient(session.user.sbToken);
      const result = await api.get<{ chatId: string | null }>(
        `/x/loc/${socialLocationId}/chat/member`,
        { memberId: socialToUserId }
      );
      return result.chatId;
    } catch (err) {
      console.error('Error finding chat:', err);
      setError('Failed to load chat');
      return null;
    }
  }, [modeType, socialLocationId, socialToUserId, session?.user?.sbToken]);

  const normalizeMessages = useCallback((messagesData: Message[]): Message[] => {
    return messagesData.map(msg => ({
      ...msg,
      media: msg.medias || [],
    }));
  }, []);

  const fetchMessagesForChat = useCallback(
    async (chatId: string, sbToken: string, userId: string): Promise<Message[]> => {
      const api = clientsideApiClient(sbToken);
      const messagesData = await api.get<Message[]>(`/protected/users/${userId}/chats/${chatId}/messages`);
      return normalizeMessages(messagesData);
    },
    [normalizeMessages]
  );

  const loadMessages = useCallback(async (chatId: string): Promise<void> => {
    if (!session?.user?.sbToken || !currentUserId) {
      setError('No authentication token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const hydratedMessages = await fetchMessagesForChat(chatId, session.user.sbToken, currentUserId);
      setMessages(hydratedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.sbToken, currentUserId, fetchMessagesForChat]);

  const sendMessage = useCallback(
    async (content: string, files?: File[]): Promise<Message> => {
      if (!modeType || !session?.user?.sbToken) {
        throw new Error('Chat not initialized or no authentication token');
      }

      let currentChatId = resolvedChatId;
      const tempId = generateTempId();
      const hasFiles = files && files.length > 0;

      try {
        // Social mode: create chat if it doesn't exist
        if (!currentChatId && modeType === 'social' && socialLocationId && socialToUserId) {
          const api = clientsideApiClient(session.user.sbToken);
          const chatResult = await api.post(`/x/loc/${socialLocationId}/chat/member`, {
            memberId: socialToUserId,
          }) as { chatId: string };
          currentChatId = chatResult.chatId;
          setResolvedChatId(currentChatId);
        }

        if (!currentChatId) {
          throw new Error('No chat ID available');
        }

        // Create optimistic message for file uploads
        if (hasFiles) {
          const senderId = modeType === 'social' && socialFromUserId ? socialFromUserId : session.user.id;
          const tempMessage: Message = {
            id: tempId,
            chatId: currentChatId,
            senderId,
            content,
            created: new Date(),
            updated: null,
            sender: {
              id: session.user.id,
              name: session?.user?.name || 'You',
              image: session?.user?.image || null,
            } as any,
            medias: [],
            reactions: [],
            progress: 0,
            pendingFiles: files,
            isOptimistic: true,
            replyId: null
          };
          setOptimisticMessage(tempMessage);
        }

        let uploadedFiles: Record<string, any>[] = [];

        // Upload files with progress
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

          const fileProgresses = new Array(files.length).fill(0);
          const calculateOverallProgress = () => {
            const total = fileProgresses.reduce((sum, p) => sum + Math.min(100, Math.max(0, p)), 0);
            return Math.min(100, Math.round(total / files.length));
          };

          await Promise.all(
            files.map(async (file, index) => {
              const presignedUrl = presignedUrls[index];
              await uploadToS3(file, presignedUrl.uploadUrl, progress => {
                fileProgresses[index] = progress;
                setOptimisticMessage(prev =>
                  prev ? { ...prev, progress: calculateOverallProgress() } : null
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

        // Send to API
        const api = clientsideApiClient(session.user.sbToken);
        const enrichedMessage = await api.post(`/protected/users/${session.user.id}/chats/${currentChatId}/messages`, {
          content,
          files: uploadedFiles,
        }) as any;

        setOptimisticMessage(null);

        const mapped: Message = {
          ...enrichedMessage,
          media: enrichedMessage.medias || [],
          reactions: enrichedMessage.reactions || [],
        };

        setMessages(prev => {
          if (prev.some(m => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });

        return enrichedMessage;
      } catch (err) {
        setOptimisticMessage(null);
        console.error('Error sending message:', err);
        throw err;
      }
    },
    [modeType, socialLocationId, socialToUserId, socialFromUserId, resolvedChatId, session]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<Message> => {
      if (!resolvedChatId || !session?.user?.sbToken) {
        throw new Error('Chat not initialized or no authentication token');
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, content: content.trim(), updated: new Date() } : m
        )
      );

      try {
        const api = clientsideApiClient(session.user.sbToken);
        const updatedMessage = await api.put(
          `/protected/users/${session.user.id}/chats/${resolvedChatId}/messages/${messageId}`,
          { content: content.trim() }
        ) as any;

        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, content: updatedMessage.content, updated: updatedMessage.updated }
              : m
          )
        );
        return updatedMessage;
      } catch (err) {
        if (resolvedChatId) loadMessages(resolvedChatId);
        throw err;
      }
    },
    [resolvedChatId, session?.user?.sbToken, session?.user?.id, loadMessages]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!resolvedChatId || !session?.user?.sbToken) {
        throw new Error('Chat not initialized or no authentication token');
      }

      const messageToDelete = messages.find(m => m.id === messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));

      try {
        const api = clientsideApiClient(session.user.sbToken);
        await api.delete(`/protected/users/${session.user.id}/chats/${resolvedChatId}/messages/${messageId}`);
      } catch (err) {
        if (messageToDelete) {
          setMessages(prev =>
            [...prev, messageToDelete].sort(
              (a, b) =>
                new Date(a.created).getTime() - new Date(b.created).getTime()
            )
          );
        }
        throw err;
      }
    },
    [resolvedChatId, session?.user?.sbToken, session?.user?.id, messages]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: ReactionEmoji): Promise<void> => {
      if (!session?.user?.sbToken || !session?.user?.id) {
        throw new Error('No authentication token available');
      }

      const currentUserId = session.user.id;
      const message = messages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(
        r => r.display === emoji.value && r.userIds?.includes(currentUserId)
      );

      // Optimistically update local state
      setMessages(prev =>
        prev.map((m: Message): Message => {
          if (m.id !== messageId) return m;

          const currentReactions = m.reactions || [];

          if (existingReaction) {
            // Remove user's reaction
            const updatedReactions = currentReactions
              .map(r => {
                if (r.display !== emoji.value) return r;
                return {
                  ...r,
                  count: r.count - 1,
                  userIds: r.userIds.filter(id => id !== currentUserId),
                  userNames: r.userNames.filter((_, idx) => r.userIds[idx] !== currentUserId),
                };
              })
              .filter(r => r.count > 0);

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
                    userNames: [...r.userNames, session?.user?.name || 'You'],
                  };
                }),
              };
            } else {
              return {
                ...m,
                reactions: [
                  ...currentReactions,
                  {
                    ownerType: 'message',
                    ownerId: messageId,
                    type: 'emoji',
                    display: emoji.value,
                    name: emoji.name,
                    count: 1,
                    userIds: [currentUserId],
                    userNames: [session?.user?.name || 'You'],
                    created: new Date(),
                  },
                ],
              };
            }
          }
        })
      );

      // Make API call - server handles toggle logic
      try {
        const response = await fetch(`/api/protected/reactions/message/${messageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        });

        if (!response.ok) {
          throw new Error('Failed to update reaction');
        }
      } catch (err) {
        console.error('Error toggling reaction:', err);
        // Revert optimistic update on error by reloading
        if (resolvedChatId) {
          loadMessages(resolvedChatId);
        }
        throw err;
      }
    },
    [messages, session?.user?.sbToken, session?.user?.name, session?.user?.id, resolvedChatId, loadMessages]
  );

  const refresh = useCallback(
    () => (resolvedChatId ? loadMessages(resolvedChatId) : Promise.resolve()),
    [resolvedChatId, loadMessages]
  );

  // ============== Effects ==============

  useEffect(() => {
    if (!enabled || !session?.user?.sbToken || !modeType || !supabaseClient) {
      setMessages([]);
      setIsConnected(false);
      setResolvedChatId(null);
      setOnlineUsers([]);
      return;
    }

    // Validate mode-specific requirements
    if (modeType === 'direct' && !directChatId) {
      setMessages([]);
      setIsConnected(false);
      setResolvedChatId(null);
      setOnlineUsers([]);
      return;
    }

    if (modeType === 'social' && (!socialFromUserId || !socialToUserId || !socialLocationId)) {
      setMessages([]);
      setIsConnected(false);
      setResolvedChatId(null);
      setOnlineUsers([]);
      return;
    }

    let mounted = true;
    let channel: RealtimeChannel | null = null;
    const sbToken = session.user.sbToken;

    const initialize = async () => {
      if (!mounted) return;

      await supabaseClient.realtime.setAuth(sbToken);

      // Resolve chat ID
      let chatId: string | null = null;
      if (modeType === 'direct') {
        chatId = directChatId;
      } else {
        setIsLoading(true);
        chatId = await findChat();
        setIsLoading(false);
      }

      if (!mounted) return;

      // Social mode: no chat yet is OK (will create on first message)
      if (!chatId && modeType === 'social') {
        setIsConnected(true);
        return;
      }

      if (!chatId) return;

      setResolvedChatId(chatId);

      try {
        setIsLoading(true);
        setError(null);
        const hydratedMessages = await fetchMessagesForChat(chatId, sbToken, session.user.id);
        if (!mounted) return;
        setMessages(hydratedMessages);
      } catch (err) {
        console.error('Error loading messages:', err);
        if (mounted) setError('Failed to load messages');
      } finally {
        if (mounted) setIsLoading(false);
      }

      if (!mounted) return;

      // Subscribe to realtime
      channel = supabaseClient.channel(`chat:${chatId}`, {
        config: {
          private: true,
          presence: enablePresence && session?.user?.id
            ? { key: session.user.id }
            : undefined,
          broadcast: { ack: false, self: false },
        },
      });

      if (enablePresence) {
        channel.on('presence', { event: 'sync' }, () => {
          if (!mounted) return;
          const state = channel?.presenceState() ?? {};
          const online = Object.keys(state);
          setOnlineUsers(online);
        });

        channel.on('presence', { event: 'join' }, ({ key }) => {
          if (!mounted) return;
          setOnlineUsers(prev => (prev.includes(key) ? prev : [...prev, key]));
        });

        channel.on('presence', { event: 'leave' }, ({ key }) => {
          if (!mounted) return;
          setOnlineUsers(prev => prev.filter(userId => userId !== key));
        });
      }

      // Listen for new messages
      channel.on('broadcast', { event: 'new_message' }, payload => {
        if (!mounted) return;
        const msg = payload.payload?.message;
        if (!msg?.id) {
          console.warn('Invalid message received:', msg);
          return;
        }

        const mapped: Message = {
          ...msg,
          media: msg.medias || [],
          reactions: msg.reactions || [],
        };

        setMessages(prev => (prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]));
      });

      // Listen for message updates
      channel.on('broadcast', { event: 'message_updated' }, payload => {
        if (!mounted) return;
        const msg = payload.payload?.message;
        if (!msg?.id) {
          console.warn('Invalid updated message received:', msg);
          return;
        }

        const mapped: Message = {
          ...msg,
          medias: msg.medias || [],
          reactions: msg.reactions || [],
        };

        setMessages(prev => prev.map(m => (m.id === mapped.id ? mapped : m)));
      });

      // Listen for message deletions
      channel.on('broadcast', { event: 'message_deleted' }, payload => {
        if (!mounted) return;
        const messageId = payload.payload?.messageId;
        if (!messageId) {
          console.warn('Invalid deleted message ID received:', payload.payload);
          return;
        }

        setMessages(prev => prev.filter(m => m.id !== messageId));
      });

      // Subscribe to the channel
      channel.subscribe(status => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (enablePresence && session?.user?.id) {
            void channel?.track({
              user_id: session.user.id,
              online_at: new Date().toISOString(),
            });
          }
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

    initialize();

    // Cleanup
    return () => {
      mounted = false;
      if (channel && supabaseClient) {
        channel.unsubscribe();
        supabaseClient.removeChannel(channel);
      }
      setOnlineUsers([]);
    };
  }, [
    enabled,
    session?.user?.sbToken,
    modeType,
    directChatId,
    socialFromUserId,
    socialToUserId,
    socialLocationId,
    enablePresence,
    supabaseClient,
    findChat,
    fetchMessagesForChat,
    session?.user?.id,
  ]);

  // ============== Return ==============

  return {
    messages: displayMessages,
    chatId: resolvedChatId,
    isConnected,
    onlineUsers,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    refresh,
  };
};
