'use client'

import { useSession } from '@/hooks/useSession'
import { SupportConversation, SupportMessage } from '@subtrees/types'
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

            console.log('🔧 Setting up support realtime channels:', { locationId, conversationId })
            // Set auth token for realtime
            console.log('🔐 Setting auth token for realtime...')
            await authenticatedSupabase.realtime.setAuth(session.user.sbToken)
            console.log('✅ Auth token set')

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
                    console.log('📨 Received new_message broadcast:', { payload, conversationId })
                    if (!mounted) return
                    const message = payload.payload?.message
                    if (message?.id) {
                        console.log('✅ Processing new message:', { messageId: message.id, content: message.content })
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
                    } else {
                        console.warn('⚠️ Invalid message structure:', payload)
                    }
                })

                // Listen for system messages
                messagesChannel.on('broadcast', { event: 'system_message' }, (payload) => {
                    console.log('📨 Received system_message broadcast:', { payload, conversationId })
                    if (!mounted) return
                    const message = payload.payload?.message
                    if (message?.id) {
                        console.log('✅ Processing system message:', { messageId: message.id, content: message.content })
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
                    } else {
                        console.warn('⚠️ Invalid system message structure:', payload)
                    }
                })

                messagesChannel.subscribe((status) => {
                    console.log('📡 Messages channel status:', { status, conversationId })
                    if (!mounted) return
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Subscribed to conversation messages:', conversationId)
                        setIsConnected(true)
                        setError(null)
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error('❌ Messages channel failed:', { status, conversationId })
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
                console.log('📨 Received conversation_updated broadcast:', { payload, locationId })
                if (!mounted) return
                const conv = payload.payload?.conversation
                if (conv?.id) {
                    console.log('✅ Processing conversation update:', { conversationId: conv.id, title: conv.title })
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
                        console.log('📢 Vendor active state changed for conversation:', conv.id)
                        callbacksRef.current.onVendorActiveChange?.(
                            formattedConversation.id,
                            true
                        )
                    }
                } else {
                    console.warn('⚠️ Invalid conversation update structure:', payload)
                }
            })

            // Listen for new conversations
            locationChannel.on('broadcast', { event: 'conversation_inserted' }, (payload) => {
                console.log('📨 Received conversation_inserted broadcast:', { payload, locationId })
                if (!mounted) return
                const conv = payload.payload?.conversation
                if (conv?.id) {
                    console.log('✅ Processing new conversation:', { conversationId: conv.id, title: conv.title })
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
                } else {
                    console.warn('⚠️ Invalid conversation insert structure:', payload)
                }
            })

            locationChannel.subscribe((status) => {
                console.log('📡 Location channel status:', { status, locationId })
                if (!mounted) return
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Subscribed to location updates:', locationId)
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Location channel failed:', { status, locationId })
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
