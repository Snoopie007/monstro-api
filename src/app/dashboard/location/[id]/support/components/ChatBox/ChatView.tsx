'use client'

import { ScrollArea } from '@/components/ui'
import { useEffect, useRef, useState } from 'react'

import { tryCatch, isGroupedSupportMessage } from '@/libs/utils'
import { SupportMessage } from '@/types'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { useSupportRealtime } from '../../hooks/useSupportRealtime'
import { useSupport } from '../../providers/SupportProvider'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

export function ChatView({ lid }: { lid: string }) {
    const { current, updateConversation, setConversations, conversations } = useSupport()
    const [messages, setMessages] = useState<SupportMessage[]>([])
    
    
    const { isAiMode, isConnected, error } = useSupportRealtime({
        locationId: lid,
        conversationId: current?.id,
        conversation: current || undefined,
        onNewMessage: (message) => {
            console.log('🎯 ChatView received new message:', { messageId: message.id, content: message.content })
            setMessages((prev) => [...prev, message])
        },
        onConversationUpdate: async (conversation) => {
            if (
                conversation.updated?.toISOString() !==
                    current?.updated?.toISOString() &&
                conversation.id === current?.id &&
                conversation.isVendorActive !== current?.isVendorActive
            ) {
                updateConversation(conversation.id, {
                    isVendorActive: conversation.isVendorActive,
                })
            } else if (conversation.updated?.toISOString() !== current?.updated?.toISOString() && conversation.id === current?.id && conversation.title !== current?.title) {
                updateConversation(conversation.id, {
                    title: conversation.title,
                })
            }
        },
        onConversationInsert: async (conversation) => {
            const member = await tryCatch(
                fetch(`/api/protected/loc/${lid}/members/${conversation.memberId}/info`)
            )
            if (member.error || !member.result || !member.result.ok) {
                toast.error('Failed to get member')
                return 
            }
            const memberData = await member.result.json()
            setConversations([...conversations, {...conversation, member: memberData.member}])
        },
    })

    useEffect(() => {
        if (current) {
            setMessages(current.messages || [])
        }
    }, [current])

    useEffect(() => {
        console.log('📊 ChatView connection status:', { 
            isConnected, 
            error, 
            conversationId: current?.id,
            messageCount: messages.length 
        })
    }, [isConnected, error, current?.id, messages.length])

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    useEffect(() => {
        if (current) {
            getMessages()
        }
    }, [current])

    async function getMessages() {
        if (!current) return

        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${lid}/support/conversations/${current.id}/messages`
            )
        )

        if (error || !result || !result.ok) {
            toast.error('Failed to get messages')
            return
        }

        const data = await result.json()
        setMessages(data)
    }

    if (!current) {
        return (
            <div className="text-center h-full flex items-center justify-center">
                <p className="text-lg font-medium text-muted-foreground mb-2">
                    No Conversation Selected
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {current && (
                <div className="flex flex-row gap-2 items-center justify-between border-b border-foreground/5 p-4">
                    <div className="flex flex-col ">
                        <span className=" font-bold">{current.title}</span>
                        <div className="text-sm text-muted-foreground">
                            Opened by {current.member?.firstName}{' '}
                            {current.member?.lastName} on{' '}
                            {format(current.created, 'MMM d, yyyy')}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full flex-1  overflow-hidden">
                <div className="relative h-full flex flex-col">
                    <ScrollArea className="h-full px-4">
                        <div className="space-y-1 py-4">
                            {messages
                                .sort(
                                    (a, b) =>
                                        new Date(a.created).getTime() -
                                        new Date(b.created).getTime()
                                )
                                .filter((message) => ["ai", "human", "system", "staff"].includes(message.role))
                                .map((message, index, arr) => {
                                    const prevMessage = index > 0 ? arr[index - 1] : null;
                                    const nextMessage = index < arr.length - 1 ? arr[index + 1] : null;
                                    const isGrouped = isGroupedSupportMessage(message, prevMessage);
                                    const isGroupedWithNext = isGroupedSupportMessage(nextMessage, message);
                                    return (
                                        <div className={!isGroupedWithNext ? 'mb-4' : ''}>
                                            <ChatMessage
                                                key={index}
                                                message={message}
                                                member={current.member}
                                                isGrouped={isGrouped}
                                            />
                                        </div>
                                    );
                                })}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <ChatInput lid={lid} />
                </div>
            </div>
        </div>
    )
}
