'use client'
import { cn } from '@/libs/utils'
import ReactMarkdown from 'react-markdown'
import { useEffect, useMemo, useRef } from 'react'
import { ScrollArea } from '@/components/ui'

import { TestChatMessage } from '@/types'
import { Placeholder } from '../../../components'
import { useBotSettingContext } from '../../provider'

export function TestChatMessages() {
    const { messages } = useBotSettingContext()

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    return (
        <ScrollArea className="flex-1  max-h-[calc(100%-160px)]  ">
            <div className="flex flex-col gap-4 p-4">
                {messages.map((message: TestChatMessage) => (
                    <MessageFormat message={message} key={message.id} />
                ))}
                <div ref={scrollRef} />
            </div>
        </ScrollArea>
    )
}

function MessageFormat({ message }: { message?: TestChatMessage }) {
    const isAgent = useMemo(() => {
        return message?.role === 'assistant'
    }, [message])
    console.log(message?.content)
    return (
        <div className={cn(`message mb-3 break-words`)}>
            <div className="flex gap-4 flex-row justify-start">
                <div className="flex-initial">
                    <div className="flex w-6 h-6 rounded-full bg-foreground"></div>
                </div>
                <div className="flex-1">
                    <span className="font-semibold leading-none">
                        {isAgent ? 'Monstro' : 'You'}
                    </span>
                    {message?.isLoading ? (
                        <Placeholder />
                    ) : (
                        <div className="text-base text-foreground py-2 prose prose-sm max-w-none">
                            <ReactMarkdown>
                                {message?.content || ''}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
