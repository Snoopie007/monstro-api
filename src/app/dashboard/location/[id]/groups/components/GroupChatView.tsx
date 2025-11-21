'use client'

import { useGroups } from "./GroupsProvider";
import { GroupChatInput } from "./GroupChatInput";
import { Avatar, AvatarFallback, AvatarImage, ScrollArea } from "@/components/ui";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useSession } from "@/hooks/useSession";
import { useRef } from "react";
import { formatMessageTimestamp, getDateLabel } from "@/libs/utils";
import { isSameDay } from "date-fns";

export function GroupChatView({ lid }: { lid: string }) {
    const {currentChat} = useGroups()
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const { messages, sendMessage, isLoading } = useGroupChat({
        chatId: currentChat?.id ?? null,
        fromUserId: session?.user?.id ?? null,
    })

    const handleSendMessage = async (content: string, files: File[]) => {
        await sendMessage(content, files);
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
                        <div className="space-y-6 py-4">
                        {messages?.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                            No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((message, index) => {
                                const isFromCurrentUser = message.senderId === session?.user?.id;
                                const displayName = message.sender?.name ?? "Unknown";
                                const avatarSrc = message.sender?.image ?? undefined;
                                const fallbackInitials = displayName.charAt(0) ?? "?";
                                
                                const prevMessage = messages[index - 1];
                                const isNewDay = !prevMessage || !isSameDay(new Date(prevMessage.created), new Date(message.created));
            
                                return (
                                    <div key={message.id}>
                                        {isNewDay && (
                                            <div className="relative flex items-center justify-center my-6">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-muted-foreground/20" />
                                                </div>
                                                <span className="relative bg-muted px-2 text-xs text-muted-foreground rounded-full">
                                                    {getDateLabel(new Date(message.created))}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex gap-3 flex-row`}
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={avatarSrc} />
                                                <AvatarFallback className="text-xs">
                                                {fallbackInitials || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={`flex flex-col gap-1 max-w-[70%] items-start`}
                                            >
                                                <div className="flex flex-row items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {isFromCurrentUser ? "You" : displayName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground/60">
                                                        {formatMessageTimestamp(message.created)}
                                                    </span>
                                                </div>
                                                <div
                                                className={`rounded-lg px-3 py-2 text-sm ${
                                                    isFromCurrentUser
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                                }`}
                                                >
                                                {message.content}
                                                </div>
                                                
                                                {message.media && message.media.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {message.media.map((mediaItem) => (
                                                            <div key={mediaItem.id} className="relative rounded-md overflow-hidden border border-border/50 max-w-[300px]">
                                                                {mediaItem.fileType === 'image' || mediaItem.mimeType?.startsWith('image/') ? (
                                                                    <img 
                                                                        src={mediaItem.url} 
                                                                        alt={mediaItem.fileName || 'Attachment'}
                                                                        className="w-full h-auto max-h-[300px] object-cover block"
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <a 
                                                                        href={mediaItem.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center p-3 bg-muted/50 gap-2 min-w-[150px] hover:bg-muted transition-colors"
                                                                    >
                                                                        <span className="text-xs truncate max-w-[120px]">{mediaItem.fileName}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                            </div>
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