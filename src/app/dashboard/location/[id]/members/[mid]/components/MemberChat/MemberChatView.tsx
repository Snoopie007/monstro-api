"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MemberChatInput } from "./MemberChatInput";
import { useSocialChat } from "@/hooks/useSocialChat";
import { useSession } from "@/hooks/useSession";
import { ScrollArea } from "@/components/ui/";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  email?: string | null;
}

interface MemberChatViewProps {
  locationId: string;
  currentMemberId: string; // The member page we're viewing
}

export function MemberChatView({ locationId, currentMemberId }: MemberChatViewProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Admin can masquerade as a member
  const [masqueradeAsMemberId, setMasqueradeAsMemberId] = useState<string | null>(null);
  
  // Admin can choose which member to chat with
  const [chatWithMemberId, setChatWithMemberId] = useState<string | null>(currentMemberId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine who is sending the message (masqueraded or current admin's member)
  const fromMemberId = masqueradeAsMemberId || session?.user?.memberId || null;

  // Use the chat hook
  const {
    messages,
    isConnected,
    isLoading,
    chatId,
    error,
    sendMessage
  } = useSocialChat({
    fromMemberId,
    toMemberId: chatWithMemberId,
    locationId,
    enabled: !!fromMemberId && !!chatWithMemberId && fromMemberId !== chatWithMemberId,
  });

  // Load members for the dropdowns
  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const response = await fetch(
          `/api/protected/loc/${locationId}/members?size=1000`
        );
        const data = await response.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    if (locationId) {
      loadMembers();
    }
  }, [locationId]);

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

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown';
  };

  const getMemberInitials = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return '?';
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  };

  const getMemberAvatar = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.avatar;
  };

  const canChat = fromMemberId && chatWithMemberId && fromMemberId !== chatWithMemberId;

  return (
    <div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-2 border-b border-foreground/5 p-4 flex-shrink-0">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-bold">Member Chat</span>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Connected
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs">
                {error}
              </Badge>
            )}
          </div>
        </div>

        {/* Admin Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Send messages as:
            </label>
            <Select
              value={masqueradeAsMemberId || ""}
              onValueChange={(value) => setMasqueradeAsMemberId(value || null)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-xs">
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Chat with:
            </label>
            <Select
              value={chatWithMemberId || ""}
              onValueChange={(value) => setChatWithMemberId(value || null)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  members
                    .filter(m => m.id !== masqueradeAsMemberId)
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-xs">
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {!canChat ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground block">
                {!masqueradeAsMemberId
                  ? "Select a member to send messages as"
                  : !chatWithMemberId
                  ? "Select a member to chat with"
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
                    const isFromCurrentUser = message.sender_id === fromMemberId;
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getMemberAvatar(message.sender_id) || undefined} />
                          <AvatarFallback className="text-xs">
                            {getMemberInitials(message.sender_id)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex flex-col gap-1 max-w-[70%] ${
                            isFromCurrentUser ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-xs text-muted-foreground">
                            {getMemberName(message.sender_id)}
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
