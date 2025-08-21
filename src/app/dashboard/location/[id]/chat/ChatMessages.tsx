"use client";
import React, { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";
import ChatMessageItem from "./ChatMessageItem";

export default function ChatMessages({ messages, contactInitial }: { messages: ChatMessage[]; contactInitial?: string }) {
    const rendered = useMemo(() => {
        return (
            <div className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                {messages.map((message, index) => {
                    const isOwnMessage = message.role === "user";

                    const messageDate = new Date(message.created);
                    const prevMessageDate = index > 0 ? new Date(messages[index - 1].created) : null;
                    const isNewDay =
                        index === 0 ||
                        !prevMessageDate ||
                        messageDate.getFullYear() !== prevMessageDate.getFullYear() ||
                        messageDate.getMonth() !== prevMessageDate.getMonth() ||
                        messageDate.getDate() !== prevMessageDate.getDate();

                    const showHeader =
                        index === 0 ||
                        messages[index - 1]?.role !== message.role ||
                        messages[index - 1]?.channel !== message.channel;

                    const dateSeparator = isNewDay ? (
                        <div key={`date-separator-${message.id}-${index}`} className="w-full flex justify-center my-2">
                            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full shadow">
                                {messageDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                            </span>
                        </div>
                    ) : null;

                    return (
                        <div key={`${message.id}-${index}`}>
                            {dateSeparator}
                            <ChatMessageItem message={message} isOwnMessage={isOwnMessage} showHeader={showHeader} contactInitial={contactInitial} />
                        </div>
                    );
                })}
            </div>
        );
    }, [messages, contactInitial]);

    return <div className="flex flex-col h-full">{messages.length === 0 ? <div className="flex-1 grid place-items-center text-muted-foreground">No messages</div> : rendered}</div>;
}


