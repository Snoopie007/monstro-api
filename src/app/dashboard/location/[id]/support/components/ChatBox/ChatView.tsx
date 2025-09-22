'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button, ScrollArea } from '@/components/ui'

import { SupportMessage } from '@/types'
import { toast } from 'react-toastify'
import { useSupportRealtime } from '../../hooks/useSupportRealtime'
import { useSupport } from '../../providers/SupportProvider'
import { tryCatch } from '@/libs/utils'
import { ChatMessage } from './ChatMessage'
import { MoreHorizontal } from 'lucide-react'
import { ChatInput } from './ChatInput'
import { format } from 'date-fns'

export function ChatView({ lid }: { lid: string }) {
    const { current } = useSupport()
    const [messages, setMessages] = useState<SupportMessage[]>([])

    const { isAiMode } = useSupportRealtime({
        locationId: lid,
        conversationId: current?.id,
        conversation: current || undefined,
    })

    useEffect(() => {
        if (current) {
            setMessages(current.messages || [])
        }
    }, [current])

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
        console.log(data)
        setMessages(data)
    }

    if (!current) {
        return (
            <div className="text-center">
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
                    <div className="flex flex-row gap-1 items-center">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg border-foreground/10"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full flex-1  overflow-hidden">
                <div className="relative h-full flex flex-col">
                    <ScrollArea className="h-full px-4">
                        <div className="space-y-8 py-4">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    member={current.member}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <ChatInput lid={lid} />
                </div>
            </div>
        </div>
    )
}
