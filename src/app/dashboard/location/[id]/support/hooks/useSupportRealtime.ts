'use client'

import { useSession } from '@/hooks/useSession'
import { SupportConversation, SupportMessage } from '@/types'
import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSupportRealtimeOptions {
    locationId: string
    conversationId?: string
    conversation?: SupportConversation
    onConversationUpdate?: (conversation: SupportConversation) => void
    onNewMessage?: (message: SupportMessage) => void
    onVendorActiveChange?: (
        conversationId: string,
        isVendorActive: boolean
    ) => void
    onConversationInsert?: (conversation: SupportConversation) => void
}

export function useSupportRealtime({
    locationId,
    conversationId,
    conversation,
    onConversationUpdate,
    onNewMessage,
    onVendorActiveChange,
    onConversationInsert,
}: UseSupportRealtimeOptions) {
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { data: session } = useSession()

    // Service role Supabase client for reliable realtime
    const supabaseRef = useRef<any>(null)
    const channelsRef = useRef<any[]>([])

    // Use refs to store latest callbacks without triggering re-renders
    const callbacksRef = useRef({
        onConversationUpdate,
        onNewMessage,
        onVendorActiveChange,
        onConversationInsert,
    })

    // Keep callbacks up to date
    useEffect(() => {
        callbacksRef.current = {
            onConversationUpdate,
            onNewMessage,
            onVendorActiveChange,
            onConversationInsert,
        }
    })

    // Initialize Supabase client for reliable realtime
    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            setError('Missing Supabase configuration')
            return
        }

        const client = createClient(supabaseUrl, supabaseKey, {
            realtime: {
                params: {
                    eventsPerSecond: 100,
                },
            },
        })

        supabaseRef.current = client
    }, [])

    // Handle message insert - filter out own messages to prevent echo
    const handleMessageInsert = useCallback(
        (payload: Record<string, any>) => {
            try {
                const message = payload.new

                // Skip if this is our own message (prevent echo)
                // if (message.agent_id === session?.user?.id) {
                // 	return;
                // }

                // Only process if it's for our conversation
                if (
                    conversationId &&
                    message.conversation_id === conversationId
                ) {
                    const formattedMessage: SupportMessage = {
                        id: message.id,
                        conversationId: message.conversation_id,
                        content: message.content,
                        role: message.role,
                        channel: message.channel,
                        agentId: message.agent_id,
                        agentName: message.agent_name,
                        metadata: message.metadata || {},
                        created: new Date(message.created_at),
                    }

                    callbacksRef.current.onNewMessage?.(formattedMessage)
                }
            } catch (error) {
                console.error('Error handling message insert:', error)
            }
        },
        [conversationId, session?.user?.id]
    )

    // Handle conversation update (copied from DatabaseListener)
    const handleConversationUpdate = useCallback(
        (payload: any) => {
            try {
                if (!payload.new || !payload.old) {
                    return
                }

                const conversation = payload.new

                // Convert to our conversation format
                const formattedConversation: SupportConversation = {
                    id: conversation.id,
                    supportAssistantId: conversation.support_assistant_id,
                    locationId: conversation.location_id,
                    memberId: conversation.member_id,
                    category: conversation.category,
                    isVendorActive: conversation.is_vendor_active,
                    status: conversation.status,
                    title: conversation.title,
                    metadata: conversation.metadata || {},
                    created: new Date(conversation.created_at),
                    updated: new Date(conversation.updated_at),
                    takenOverAt: conversation.taken_over_at
                        ? new Date(conversation.taken_over_at)
                        : null,
                    description: conversation.description || '',
                    priority: conversation.priority || 0,
                }

                // Only process if it's for our location
                if (conversation.location_id === locationId) {
                    callbacksRef.current.onConversationUpdate?.(
                        formattedConversation
                    )

                    // Check for vendor active change
                    if (
                        payload.old.is_vendor_active === false &&
                        conversation.is_vendor_active === true
                    ) {
                        callbacksRef.current.onVendorActiveChange?.(
                            conversation.id,
                            true
                        )
                    }
                }
            } catch (error) {
                console.error('Error handling conversation update:', error)
            }
        },
        [locationId]
    )

    const handleConversationInsert = useCallback(
        (payload: any) => {
            const conversation = payload.new
            const formattedConversation: SupportConversation = {
                id: conversation.id,
				category: conversation.category || '',
                supportAssistantId: conversation.support_assistant_id,
                locationId: conversation.location_id,
                memberId: conversation.member_id,
				member: conversation.member,
                title: conversation.title,
                metadata: conversation.metadata || {},
                created: new Date(conversation.created_at),
                updated: new Date(conversation.updated_at),
                takenOverAt: conversation.taken_over_at
                    ? new Date(conversation.taken_over_at)
                    : null,
                description: conversation.description || '',
                priority: conversation.priority || 0,
                status: conversation.status,
                isVendorActive: conversation.is_vendor_active,
            }
            callbacksRef.current.onConversationInsert?.(formattedConversation)
        },
        []
    )

    const startListener = useCallback(async () => {
        if (!supabaseRef.current) {
            console.error(
                'Cannot start database listener: Supabase client not initialized'
            )
            return
        }

        if (channelsRef.current.length > 0) {
            return
        }

        try {
            // Messages channel - listen to all support_messages inserts
            const messagesChannel = supabaseRef.current
                .channel('support_messages_changes', {
                    config: {
                        private: true,
                    }
                })
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'support_messages',
                    },
                    handleMessageInsert
                )
                .subscribe((status: string, error?: any) => {
                    if (error) {
                        console.error('Messages channel error:', error)
                    }
                    if (status === 'SUBSCRIBED') {
                        setIsConnected(true)
                        setError(null)
                    } else if (
                        status === 'CHANNEL_ERROR' ||
                        status === 'TIMED_OUT'
                    ) {
                        setError(`Messages channel failed: ${status}`)
                    }
                })

            // Conversations channel - listen to all support_conversations updates
            const conversationsChannel = supabaseRef.current
                .channel('support_conversations_changes', {
                    config: {
                        private: true,
                    }
                })
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'support_conversations',
                    },
                    handleConversationUpdate
                ).
				on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'support_conversations',
					},
					handleConversationInsert
				)
                .subscribe((status: string, error?: any) => {
                    if (error) {
                        console.error(
                            '[SupportRealtime] Conversations channel error:',
                            error
                        )
                    }
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error('Conversations channel failed:', status)
                        setError(`Conversations channel failed: ${status}`)
                    }
                })

            channelsRef.current = [messagesChannel, conversationsChannel]
        } catch (error) {
            console.error('Failed to start database listener:', error)
            setError('Failed to start database listener')
        }
    }, [handleMessageInsert, handleConversationUpdate, handleConversationInsert])

    // Stop database listener (adapted from DatabaseListener.stop())
    const stopListener = useCallback(async () => {
        if (channelsRef.current.length === 0) {
            return
        }

        try {
            for (const channel of channelsRef.current) {
                if (supabaseRef.current) {
                    supabaseRef.current.removeChannel(channel)
                }
            }

            channelsRef.current = []
            setIsConnected(false)
        } catch (error) {
            console.error('Error stopping database listener:', error)
        }
    }, [])

    // Start listener when component mounts
    useEffect(() => {
        if (supabaseRef.current) {
            startListener()
        }

        return () => {
            stopListener()
        }
    }, [startListener, stopListener])

    // Helper function to check if conversation is in AI mode
    const isAiMode = useCallback(
        (conv?: SupportConversation): boolean => {
            const targetConversation = conv || conversation
            return targetConversation
                ? !targetConversation.isVendorActive
                : false
        },
        [conversation]
    )

    return {
        isAiMode,
        isConnected,
        error,
    }
}
