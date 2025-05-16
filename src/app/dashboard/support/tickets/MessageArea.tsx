'use client'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/libs/utils'
import { SupportTicket, SupportTicketMessage } from '@/types'
import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"
import { IoAttach } from "react-icons/io5";
import { format } from 'date-fns'

export const scrollToBottom = (
    container: RefObject<HTMLDivElement | null>,
    smooth = false,
) => {
    if (container.current?.children.length) {
        const lastElement = container.current?.lastChild as HTMLElement
        lastElement?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
            inline: 'nearest',
        })
    }
}



export default function MessageArea({ locationId, ticket }: { locationId: string, ticket: SupportTicket }) {
    const container = useRef<HTMLDivElement | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [newReply, setNewReply] = useState("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setMessages(ticket.messages)
        scrollToBottom(container, true)
    }, [ticket])

    const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setNewReply(e.target.value);
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }

    async function sendReply() {
        if (newReply.length < 10) return;

        try {
            const res = await fetch(`/api/protected/loc/tickets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    content: newReply,
                    type: "User"
                })
            })
            if (!res.ok) throw new Error('Failed to send reply');
            setNewReply("");
            if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    }

    return (
        <>
            <div className="mt-5 rounded-t-sm border-t">
                <ScrollArea className="h-[calc(100% - 200px)] w-full pt-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            ref={container}
                            className={cn(
                                "text-white mb-8 inline-block mt-2 text-base text-left",
                                message.type === "User"
                                    ? "float-left"
                                    : "bg-white/5 max-w-[450px] py-2 px-4 float-right rounded-2xl"
                            )}
                        >
                            <div className="flex flex-col mb-4">
                                <b>{message.userName}</b>
                                <span className="text-xs text-gray-500">
                                    {format(message.created, 'MMM d, yyyy h:mm a')}
                                </span>
                            </div>
                            <p>{message.content}</p>
                        </div>
                    ))}
                    <div className="clear-both" />
                </ScrollArea>
            </div>
            <div className="bg-black flex w-full flex-col gap-1.5 border rounded-xl p-2 transition-colors">
                <div className="flex w-full flex-col p-1.5 px-4 transition-colors">
                    <textarea
                        placeholder="Type a reply"
                        onChange={handleTextareaChange}
                        rows={1}
                        dir="auto"
                        value={newReply}
                        ref={textAreaRef}
                        className="m-0 resize-none border-0 py-2 focus:outline-hidden bg-transparent px-0 text-token-text-primary focus:ring-0 focus-visible:ring-0 max-h-52"
                    />
                </div>
                <div className="flex flex-row items-center justify-between px-2">
                    <div>
                        <IoAttach size={20} className="text-white cursor-pointer" />
                    </div>
                    <div>
                        <Button
                            onClick={sendReply}
                            className="bg-white py-1.5 items-center px-4 flex flex-row gap-1 text-black h-auto"
                        >
                            <ArrowUp size={16} className="font-black" />
                            <span>Send</span>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
