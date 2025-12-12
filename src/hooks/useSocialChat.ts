import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './useSession';
import { Message, Media, ReactionCount, ReactionEmoji } from '@/types';



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
        { userId: toUserId }
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
    try {
      setIsLoading(true);
      setError(null);

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*, sender:users!sender_id(id, name, image)')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch media and reactions for messages
      const messageIds = messagesData?.map(m => m.id) || [];
      let mediaMap: Record<string, Media[]> = {};
      let reactionsMap: Record<string, ReactionCount[]> = {};

      if (messageIds.length > 0) {
        // Fetch media
        const { data: mediaData, error: mediaError } = await supabase.from('media')
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
              altText: item.alt_text,
              created: item.created_at,
              updated: item.updated_at,
              ownerId: item.owner_id,
              ownerType: item.owner_type,
              fileSize: item.file_size,
              metadata: item.metadata
            });
          });
        }

        // Fetch reactions from reaction_counts view
        const { data: reactionsData, error: reactionsError } = await supabase
          .from('reaction_counts')
          .select('*')
          .eq('owner_type', 'message')
          .in('owner_id', messageIds);

        if (!reactionsError && reactionsData) {
          reactionsData.forEach((reaction: any) => {
            if (!reactionsMap[reaction.owner_id]) {
              reactionsMap[reaction.owner_id] = [];
            }
            reactionsMap[reaction.owner_id].push({
              ownerType: reaction.owner_type,
              ownerId: reaction.owner_id,
              type: reaction.type,
              display: reaction.display,
              name: reaction.name,
              count: reaction.count,
              userIds: reaction.user_ids || [],
              userNames: reaction.user_names || []
            });
          });
        }
      }

      const mapped = messagesData?.map((message) => ({
        id: message.id,
        chatId: message.chat_id,
        senderId: message.sender_id,
        content: message.content,
        attachments: message.attachments,
        readBy: message.read_by,
        metadata: message.metadata,
        created: message.created_at,
        updated: message.updated_at,
        sender: message.sender,
        media: mediaMap[message.id] || [],
        reactions: reactionsMap[message.id] || []
      })) || [];

      setMessages(mapped);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      let uploadedFiles: Record<string, any>[] = [];

      // Step 1: Get presigned URLs if files exist
      if (files && files.length > 0) {
        const api = clientsideApiClient(session.user.sbToken);
        const presignedUrls = await api.post(`/protected/medias/presigned`, {
          chatId: currentChatId,
          files: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }) as Record<string, any>[];

        // Step 2: Upload files to S3 using presigned URLs
        await Promise.all(
          files.map(async (file, index) => {
            const presignedUrl = presignedUrls[index];
            const response = await fetch(presignedUrl.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type,
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to upload file: ${file.name}`);
            }

            uploadedFiles.push({
              fileName: presignedUrl.fileName,
              mimeType: presignedUrl.mimeType,
              fileSize: presignedUrl.fileSize,
              url: presignedUrl.publicUrl,
            });
          })
        );
      }

      // Step 3: Send message with uploaded file metadata
      const api = clientsideApiClient(session.user.sbToken);
      const enrichedMessage = await api.post(`/protected/chats/${currentChatId}/messages`, {
        content,
        files: uploadedFiles,
      }) as any;

      // Since we have self: false, we won't receive our own messages via broadcast
      // So we need to manually add it to the local state
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

      // Add duplicate check in case broadcast arrived before API response
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      return enrichedMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [chatId, fromUserId, toUserId, locationId, session?.user?.sbToken]);

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

  return {
    messages,
    isConnected,
    isLoading,
    chatId,
    error,
    sendMessage,
    toggleReaction,
    refresh: () => chatId ? loadMessages(chatId) : Promise.resolve()
  };
};
