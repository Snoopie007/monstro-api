'use client'
import { sleep, tryCatch } from '@/libs/utils'
import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from 'react'

import { ArrowUp, ChevronUp, Loader2 } from "lucide-react"
import { IoAttach } from "react-icons/io5";
import { format } from 'date-fns'
import { SupportCase, SupportCaseLog } from '@/types/admin'
import { SupportCaseMessage } from '@/types/admin'
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,
    Button, Avatar, AvatarFallback, AvatarImage,
    Badge
} from '@/components/ui'
import { ExtendedUser } from '@/types/next-auth';
import { toast } from 'react-toastify';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';




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
    const [events, setEvents] = useState<(SupportCaseMessage | SupportCaseLog)[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const logs = c.logs || []
        const messages = c.messages || []
        const combined = [...logs, ...messages].sort((a, b) =>
            new Date(a.created).getTime() - new Date(b.created).getTime()
        )
        setEvents(combined)
        scrollToBottom(container, true)
    }, [c])




    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Type a reply...',
            })
        ],
        immediatelyRender: false,
    })

    const contentLength = useMemo(() => {
        if (!editor || !editor.getHTML()) return 0
        return editor.getHTML().length
    }, [editor])


    function parseContent(content: string) {
        return content.replace(
            /(https?:\/\/[^\s<]+)/g,
            (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        )
    }

    async function send() {
        if (!editor || contentLength < 10) return;
        setIsLoading(true);

        const html = editor.getHTML() || '';
        // Convert URLs to safe links
        const safeHtml = parseContent(html)

        const { result, error } = await tryCatch(
            fetch(`/api/protected/vendor/support/cases/${c.id}/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    caseId: c.id,
                    content: safeHtml
                })
            })
        )
        await sleep(1000)
        setIsLoading(false);
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Failed to send message")
        }
        const data = await result?.json()
        setEvents(prev => [...prev, data])
        editor.commands.clearContent()

    }

    return (
        <div className='space-y-4'>
            <div className='border border-foreground/10 overflow-hidden rounded-md'>
                {events.map((event, index) => {

                    if ('from' in event) { // Type guard to check if event is SupportCaseLog
                        return <EventLogItem key={index} log={event} />
                    }
                    return (
                        <EventMessageItem key={index} message={event} user={user} isOpen={index >= events.length - 1} />
                    );
                })}
            </div>


            {c.status === "open" && (
                <div className="bg-foreground/5 flexflex-col gap-1.5 rounded-sm border p-2">
                    <div className="flex w-full flex-col p-1.5 px-4">
                        <EditorContent editor={editor} id="reply" className=" min-h-[100px] max-h-[200px] overflow-y-auto focus:outline-none " />
                    </div>
                    <div className="flex flex-row items-center justify-between px-2">
                        <div>
                            <IoAttach size={20} className="cursor-pointer" />
                        </div>
                        <div>
                            <Button
                                size="sm"
                                onClick={send}
                                disabled={isLoading || contentLength < 10}
                                variant="default"
                                className='flex flex-row gap-1 text-muted-foreground hover:text-background'
                            >
                                {isLoading ? <Loader2 className='size-4 animate-spin' /> : <ArrowUp size={14} className="" />}
                                <span>Send</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

interface EventLogItemProps {
    log: SupportCaseLog;
}

function EventLogItem({ log }: EventLogItemProps) {
    return (
        <div className='border-b bg-foreground/5 border-foreground/10 last:border-b-0 p-4 pl-16'>
            <div className='text-sm font-medium flex flex-row gap-1.5'>
                Status changed from
                <Badge status={log.from} className='capitalize rounded-full'>{log.from}</Badge>
                <span className='text-muted-foreground'>to</span>
                <Badge status={log.to} className='capitalize rounded-full'>{log.to}</Badge>
                on {format(log.created, 'MMMM d, yyyy \'at\' h:mm a')}
            </div>
        </div>
    )
}

interface EventMessageItemProps {
    message: SupportCaseMessage;
    user: ExtendedUser;
    isOpen: boolean;
}

function EventMessageItem({ message, user, isOpen }: EventMessageItemProps) {
    return (
        <Collapsible
            defaultOpen={isOpen}
            className='border-b group bg-background border-foreground/10 last:border-b-0' >
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
                <div
                    className="prose py-4 prose-headings:my-4 prose-h2:text-2xl prose-sm max-w-full prose-p:font-roboto prose-p:leading-6"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                />
            </CollapsibleContent>
        </Collapsible>
    )
}
