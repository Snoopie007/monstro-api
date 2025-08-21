"use client";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/libs/utils";
import type { ChatMessage } from "@/types/chat";
import { Mail, MessageSquare } from "lucide-react";

export default function ChatMessageItem({
    message,
    isOwnMessage,
    showHeader,
    contactInitial = "C",
}: {
    message: ChatMessage;
    isOwnMessage: boolean;
    showHeader: boolean;
    contactInitial?: string;
}) {
    const created = new Date(message.created);
    const time = created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const isEmail = message.channel === "Email";

    return (
        <div className={cn("flex mt-3 gap-3", isOwnMessage && "flex-row-reverse")}> 
            <div className="w-8 shrink-0">
                <div className="w-8 h-8 relative">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{isOwnMessage ? "Y" : contactInitial}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4">
                        <div className="w-4 h-4 bg-background rounded-full border border-border flex items-center justify-center">
                            {isEmail ? <Mail className="size-3" /> : <MessageSquare className="size-3" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn("max-w-[75%] w-fit flex flex-col gap-1", isOwnMessage ? "items-end" : "items-start")}> 
                <div className={cn("py-2 px-3 rounded-xl text-sm w-fit", isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}> 
                    {showHeader && (
                        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-2">
                            <span>{isEmail ? "Email" : message.channel}</span>
                            {message.role === "user" && message.isAI && <span className="inline-flex items-center gap-1">AI</span>}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
                <div className="flex items-center gap-2 px-1">
                    <span className="text-foreground/50 text-xs">{time}</span>
                    {message.metadata?.delivery_status && (
                        <>
                            <span className="text-foreground/30 text-xs">•</span>
                            <span className="text-foreground/50 text-xs capitalize">{message.metadata.delivery_status}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


