"use client";

import { useEffect, useRef } from "react";
import { MemberChatInput } from "./MemberChatInput";
import { useSocialChat } from "@/hooks/useSocialChat";
import { useSession } from "@/hooks/useSession";
import { ScrollArea } from "@/components/ui/";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Member } from "@/types";

interface MemberChatViewProps {
  locationId: string;
  currentMemberId: string; // The member page we're viewing
  currentMember: Member;
}

export function MemberChatView({ locationId, currentMemberId, currentMember }: MemberChatViewProps) {
  const { data: session } = useSession();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fromUserId = session?.user?.id || null;
  const toUserId = currentMember?.userId || null;
  console.log(currentMember)
  console.log(toUserId);

  // Use the chat hook with user IDs
  const {
    messages,
    isConnected,
    isLoading,
    chatId,
    error,
    sendMessage
  } = useSocialChat({
    fromUserId,
    toUserId,
    locationId,
    enabled: !!fromUserId && !!toUserId && fromUserId !== toUserId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const canChat = fromUserId && toUserId && fromUserId !== toUserId;

  const currentMemberName = `${currentMember?.firstName ?? ""} ${currentMember?.lastName ?? ""}`.trim() || "Member";
  const currentMemberInitials = `${currentMember?.firstName?.[0] ?? ""}${currentMember?.lastName?.[0] ?? ""}`.trim() || "?";
  const currentMemberAvatar = currentMember?.avatar || undefined;

  const currentUserName = session?.user?.name || session?.user?.member?.firstName || "You";
  const currentUserAvatar = session?.user?.image || session?.user?.member?.avatar || undefined;
  const currentUserInitials = (currentUserName || "?")
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-2 border-b border-foreground/5 p-4 flex-shrink-0">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-bold">Member Chat</span>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                {/* TODO: add back in when we have integrated supabase presence */}
                {/* Connected */}
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs">
                {error}
              </Badge>
            )}
          </div>
        </div>

      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {!canChat ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground block">
                {!fromUserId
                  ? "You must be logged in to chat"
                  : !toUserId
                  ? "This member cannot be reached right now"
                  : "Cannot chat with yourself"}
              </span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 h-full px-4">
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isFromCurrentUser = message.sender_id === fromUserId;
                    const displayName = isFromCurrentUser ? currentUserName : currentMemberName;
                    const avatarSrc = isFromCurrentUser ? currentUserAvatar : currentMemberAvatar;
                    const fallbackInitials = isFromCurrentUser ? currentUserInitials : currentMemberInitials;

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
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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
              <MemberChatInput
                onSend={handleSendMessage}
                disabled={!canChat || !isConnected}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
