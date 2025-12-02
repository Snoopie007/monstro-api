'use client'

import { useSession } from '@/hooks/useSession'
import { SupportConversation, SupportMessage } from '@/types'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

    const channelsRef = useRef<RealtimeChannel[]>([])

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

    // Create authenticated Supabase client (like useGroupChat does)
    const authenticatedSupabase = useMemo(() => {
        if (!session?.user?.sbToken) return null
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
                        eventsPerSecond: 100,
                    },
                },
            }
        )
    }, [session?.user?.sbToken])

    // Store previous conversation for detecting vendor active changes
    const prevConversationRef = useRef<SupportConversation | undefined>(conversation)

    // Main subscription effect
    useEffect(() => {
        if (!authenticatedSupabase || !session?.user?.sbToken || !locationId) {
            return
        }

        let mounted = true

        const setupChannels = async () => {
            if (!mounted) return

            // Set auth token for realtime
            await authenticatedSupabase.realtime.setAuth(session.user.sbToken)

            // 1. Subscribe to conversation-specific messages (if conversationId provided)
            if (conversationId) {
                const messagesChannel = authenticatedSupabase.channel(
                    `support:${conversationId}`,
                    {
                        config: {
                            private: true,
                            broadcast: { ack: false }
                        }
                    }
                )

                // Listen for new messages
                messagesChannel.on('broadcast', { event: 'new_message' }, (payload) => {
                    if (!mounted) return
                    const message = payload.payload?.message
                    if (message?.id) {
                        const formattedMessage: SupportMessage = {
                            id: message.id,
                            conversationId: message.conversationId,
                            content: message.content,
                            role: message.role,
                            channel: message.channel,
                            agentId: message.agentId,
                            agentName: message.agentName,
                            metadata: message.metadata || {},
                            created: new Date(message.created),
                        }
                        callbacksRef.current.onNewMessage?.(formattedMessage)
                    }
                })

                // Listen for system messages
                messagesChannel.on('broadcast', { event: 'system_message' }, (payload) => {
                    if (!mounted) return
                    const message = payload.payload?.message
                    if (message?.id) {
                        const formattedMessage: SupportMessage = {
                            id: message.id,
                            conversationId: message.conversationId,
                            content: message.content,
                            role: message.role,
                            channel: message.channel,
                            agentId: message.agentId,
                            agentName: message.agentName,
                            metadata: message.metadata || {},
                            created: new Date(message.created),
                        }
                        callbacksRef.current.onNewMessage?.(formattedMessage)
                    }
                })

                messagesChannel.subscribe((status) => {
                    if (!mounted) return
                    if (status === 'SUBSCRIBED') {
                        setIsConnected(true)
                        setError(null)
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        setError(`Messages channel failed: ${status}`)
                    }
                })

                channelsRef.current.push(messagesChannel)
            }

            // 2. Subscribe to location-level conversation updates
            const locationChannel = authenticatedSupabase.channel(
                `support:${locationId}`,
                {
                    config: {
                        private: true,
                        broadcast: { ack: false }
                    }
                }
            )

            // Listen for conversation updates
            locationChannel.on('broadcast', { event: 'conversation_updated' }, (payload) => {
                if (!mounted) return
                const conv = payload.payload?.conversation
                if (conv?.id) {
                    const formattedConversation: SupportConversation = {
                        id: conv.id,
                        supportAssistantId: conv.supportAssistantId,
                        locationId: conv.locationId,
                        memberId: conv.memberId,
                        category: conv.category,
                        isVendorActive: conv.isVendorActive ?? false,
                        status: conv.status,
                        title: conv.title,
                        metadata: conv.metadata || {},
                        created: new Date(conv.created),
                        updated: conv.updated ? new Date(conv.updated) : null,
                        takenOverAt: conv.takenOverAt ? new Date(conv.takenOverAt) : null,
                        description: conv.description || '',
                        priority: conv.priority || 0,
                    }

                    callbacksRef.current.onConversationUpdate?.(formattedConversation)

                    // Check for vendor active change
                    const prevConv = prevConversationRef.current
                    if (
                        prevConv &&
                        !prevConv.isVendorActive &&
                        formattedConversation.isVendorActive &&
                        formattedConversation.id === prevConv.id
                    ) {
                        callbacksRef.current.onVendorActiveChange?.(
                            formattedConversation.id,
                            true
                        )
                    }
                }
            })

            // Listen for new conversations
            locationChannel.on('broadcast', { event: 'conversation_inserted' }, (payload) => {
                if (!mounted) return
                const conv = payload.payload?.conversation
                if (conv?.id) {
                    const formattedConversation: SupportConversation = {
                        id: conv.id,
                        supportAssistantId: conv.supportAssistantId,
                        locationId: conv.locationId,
                        memberId: conv.memberId,
                        category: conv.category || '',
                        isVendorActive: conv.isVendorActive ?? false,
                        status: conv.status,
                        title: conv.title,
                        metadata: conv.metadata || {},
                        created: new Date(conv.created),
                        updated: conv.updated ? new Date(conv.updated) : null,
                        takenOverAt: conv.takenOverAt ? new Date(conv.takenOverAt) : null,
                        description: conv.description || '',
                        priority: conv.priority || 0,
                    }
                    callbacksRef.current.onConversationInsert?.(formattedConversation)
                }
            })

            locationChannel.subscribe((status) => {
                if (!mounted) return
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setError(`Location channel failed: ${status}`)
                }
            })

            channelsRef.current.push(locationChannel)
        }

        setupChannels()

        // Cleanup
        return () => {
            mounted = false
            channelsRef.current.forEach(channel => {
                channel.unsubscribe()
                authenticatedSupabase.removeChannel(channel)
            })
            channelsRef.current = []
            setIsConnected(false)
        }
    }, [authenticatedSupabase, session?.user?.sbToken, locationId, conversationId])

    // Update previous conversation ref
    useEffect(() => {
        prevConversationRef.current = conversation
    }, [conversation])

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
