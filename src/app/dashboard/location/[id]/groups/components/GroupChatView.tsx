'use client'

import { useGroups } from "./GroupsProvider";
import { GroupChatInput } from "./GroupChatInput";
import { Avatar, AvatarFallback, AvatarImage, ScrollArea } from "@/components/ui";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useSession } from "@/hooks/useSession";
import { useRef } from "react";
import { formatTime } from "@/libs/utils";
import { format } from "date-fns";

export function GroupChatView({ lid }: { lid: string }) {
    const {currentChat} = useGroups()
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const { messages, sendMessage, isLoading } = useGroupChat({
        chatId: currentChat?.id ?? null,
        fromUserId: session?.user?.id ?? null,
    })

    const handleSendMessage = async (content: string) => {
        await sendMessage(content);
    };

    if (!currentChat){
        return (
            <div className="h-full flex items-center justify-center text-center px-4">
                <div className="space-y-2">
                    <span className="text-sm text-muted-foreground block">
                        This group has no messages yet.
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-foreground/5 p-4 flex-shrink-0">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <span className="text-sm font-bold">{currentChat?.name ?? currentChat?.group?.name}</span>
              </div>
            </div>
    
          </div>
    
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 flex flex-col">
                {currentChat?.chatMembers?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-4">
                    <div className="space-y-2">
                    <span className="text-sm text-muted-foreground block">
                        This group has no members yet.
                    </span>
                    </div>
                </div>
                ) : (
                <>
                    <ScrollArea className="flex-1 w-full px-4">
                        <div className="space-y-4 py-4">
                        {currentChat?.messages?.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                            No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((message) => {
                            const isFromCurrentUser = message.senderId === session?.user?.id;
                            const displayName = message.sender?.name ?? "Unknown";
                            const avatarSrc = message.sender?.image ?? undefined;
                            const fallbackInitials = displayName.charAt(0) ?? "?";
        
                            return (
                                <div
                                key={message.id}
                                className={`flex gap-3 ${
                                    isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'
                                }`}
                                >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={avatarSrc} />
                                    <AvatarFallback className="text-xs">
                                    {fallbackInitials || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div
                                    className={`flex flex-col gap-1 max-w-[70%] ${
                                    isFromCurrentUser ? 'items-end' : 'items-start'
                                    }`}
                                >
                                    <span className="text-xs text-muted-foreground">
                                    {displayName}
                                    </span>
                                    <div
                                    className={`rounded-lg px-3 py-2 text-sm ${
                                        isFromCurrentUser
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }`}
                                    >
                                    {message.content}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.created), 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                                </div>
                            );
                            })
                        )}
                        <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <div className="flex-shrink-0 p-4">
                        <GroupChatInput onSend={handleSendMessage} disabled={isLoading} />
                    </div>
                </>
                )}
            </div>
          </div>
        </div>
      );
}