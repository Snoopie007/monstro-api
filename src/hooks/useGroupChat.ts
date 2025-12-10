import { clientsideApiClient } from '@/libs/api/client';
import supabase from '@/libs/client/supabase';
import { EmojiData, Message, MessageReaction, PresignedUploadUrl, FileUploadPayload } from '@/types/chats';
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
        .select('*,sender:users!sender_id(id, image, name)')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch media for these messages
      const messageIds = messagesData?.map(m => m.id) || [];
      let mediaMap: Record<string, any[]> = {};
      let reactionsMap: Record<string, MessageReaction[]> = {};
      
      // TODO: Move in api route instead -- loadMessages should be an api route
      if (messageIds.length > 0) {
        // Fetch media
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

        // Batch fetch reactions from reaction_counts view
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
                    display: reaction.display,
                    name: reaction.name,
                    count: reaction.count,
                    userIds: reaction.user_ids || [],
                    userNames: reaction.user_names || []
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
          media: mediaMap[message.id] || [],
          reactions: reactionsMap[message.id] || []
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
      let uploadedFiles: FileUploadPayload[] = [];

      // Step 1: Get presigned URLs if files exist
      if (files && files.length > 0) {
        const api = clientsideApiClient(session.user.sbToken);
        const presignedUrls = await api.post(`/protected/medias/presigned`, {
          chatId,
          files: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }) as PresignedUploadUrl[];

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
      const enrichedMessage = await api.post(`/protected/chats/${chatId}/messages`, {
        content,
        files: uploadedFiles,
      }) as any;

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
        media: enrichedMessage.medias || [],
        created: enrichedMessage.created,
        updated: enrichedMessage.updated,
        reactions: [], // New messages start with no reactions
      };

      // Add duplicate check in case broadcast arrived before API response
      setMessages(prev => {
        if (prev.some(m => m.id === mapped.id)) return prev;
        return [...prev, mapped];
      });
      
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
          attachments: enrichedMessage.attachments || [],
          readBy: enrichedMessage.metadata?.readBy || [],
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
          attachments: enrichedMessage.attachments || [],
          readBy: enrichedMessage.metadata?.readBy || [],
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
    emoji: EmojiData
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
    setMessages(prev => prev.map(m => {
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

  return {
    messages,
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

