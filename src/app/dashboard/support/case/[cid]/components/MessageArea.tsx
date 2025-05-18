'use client'
import { cn, sleep, tryCatch } from '@/libs/utils'
import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react'

import { ArrowUp, ChevronUp, Loader2 } from "lucide-react"
import { IoAttach } from "react-icons/io5";
import { format } from 'date-fns'
import { SupportCase } from '@/types/admin'
import { SupportCaseMessage } from '@/types/admin'
import { Textarea } from '@/components/forms'
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Button, Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { ExtendedUser } from '@/types/next-auth';
import { toast } from 'react-toastify';





function scrollToBottom(container: RefObject<HTMLDivElement | null>, smooth = false) {
    if (container.current?.children.length) {
        const lastElement = container.current?.lastChild as HTMLElement
        lastElement?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
            inline: 'nearest',
        })
    }
}



export default function MessageArea({ c, user }: { c: SupportCase, user: ExtendedUser }) {
    const container = useRef<HTMLDivElement | null>(null);
    const [messages, setMessages] = useState<SupportCaseMessage[]>([]);
    const [content, setContent] = useState("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMessages(c.messages || [])
        scrollToBottom(container, true)
    }, [c])

    const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }

    async function send() {
        if (content.length < 10) return;
        setIsLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/vendor/support/cases/${c.id}/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    caseId: c.id,
                    content
                })
            })
        )
        await sleep(1000)
        setIsLoading(false);
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Failed to send message")
        }
        const data = await result?.json()
        setContent("");
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
        }
    }

    return (
        <div className='space-y-4'>

            <div className='border border-foreground/10 rounded-sm'>
                {messages.map((message, index) => (
                    <Collapsible key={index} className='border-b group bg-foreground/5 border-foreground/10 last:border-b-0' >
                        <CollapsibleTrigger className='flex flex-row items-center justify-between  p-4 w-full'>
                            <div className='flex flex-row gap-2'>
                                <Avatar>
                                    <AvatarImage src={message.agentId ? "/monstro-logo.png" : user?.image || ""} />
                                    <AvatarFallback className='bg-foreground/10 text-foreground/50 font-bold'>
                                        {message.agentId ? "M" : user?.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col text-sm">
                                    <div className='font-medium text-left'>{message.agentId ? "Monstro Support" : user?.name} </div>
                                    <span className="text-muted-foreground text-xs">
                                        {format(message.created, 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                            </div>
                            <ChevronUp className='size-5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-300' />
                        </CollapsibleTrigger>
                        <CollapsibleContent className='px-4 pb-10 text-base text-foreground/80'>
                            {message.content}
                        </CollapsibleContent>
                    </Collapsible>

                ))}
            </div>


            <div className="bg-foreground/5 flexflex-col gap-1.5 rounded-sm border p-2">
                <div className="flex w-full flex-col p-1.5 px-4">
                    <Textarea placeholder="Type a reply" onChange={handleTextareaChange} rows={1} value={content} ref={textAreaRef}
                        className={cn(
                            "resize-none border-0 bg-transparent px-0 py-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0  ",
                        )}
                    />
                </div>
                <div className="flex flex-row items-center justify-between px-2">
                    <div>
                        <IoAttach size={20} className="cursor-pointer" />
                    </div>
                    <div>
                        <Button
                            size="sm"
                            onClick={send}
                            disabled={isLoading || content.length < 10}
                            variant="default"
                            className='flex flex-row gap-1 text-muted-foreground hover:text-background'
                        >
                            {isLoading ? <Loader2 className='size-4 animate-spin' /> : <ArrowUp size={14} className="" />}
                            <span>Send</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
