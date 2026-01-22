"use client";

import { Input } from "@/components/forms";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { tryCatch } from "@/libs/utils";
import { ChatMember } from "@/types";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

type ChatMembersDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lid: string;
    chatId: string;
    chatMembers?: ChatMember[];
};

export function ChatMembersDialog({
    open,
    onOpenChange,
    lid,
    chatId,
    chatMembers = []
}: ChatMembersDialogProps) {
    const [members, setMembers] = useState<ChatMember[]>(chatMembers);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [adding, setAdding] = useState(false);

    // Update members when chatMembers prop changes
    useEffect(() => {
        setMembers(chatMembers);
    }, [chatMembers]);

    const searchMembers = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members?query=${encodeURIComponent(searchQuery)}&size=10`)
        );
        setLoading(false);

        if (error || !result || !result.ok) {
            console.error("Search failed", error);
            return;
        }
        const data = await result.json();
        // Filter out members that are already in the chat
        const existingUserIds = new Set(members.map(m => m.userId));
        const filteredMembers = (data.members || []).filter(
            (m: any) => !existingUserIds.has(m.userId)
        );
        setResults(filteredMembers);
    }

    const debouncedSearch = useMemo(
        () => debounce(searchMembers, 300),
        [lid, members]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    const handleSearchResultClick = (member: any) => {
        setSelectedMember(member);
        setShowConfirmDialog(true);
    };

    const handleAddMember = async () => {
        if (!selectedMember) return;

        setAdding(true);
        try {
            const response = await fetch(`/api/protected/chats/${chatId}/members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    memberId: selectedMember.id,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to add member");
            }

            // Add the new member to local state
            const newChatMember: ChatMember = {
                chatId: chatId,
                userId: selectedMember.userId,
                joined: new Date(),
                user: {
                    id: selectedMember.id,
                    name: `${selectedMember.firstName} ${selectedMember.lastName}`,
                    email: selectedMember.email,
                    emailVerified: false,
                    image: selectedMember.avatar,
                    username: selectedMember.username,
                    discriminator: selectedMember.discriminator,
                    created: new Date(),
                    updated: null,
                },
            };
            setMembers([...members, newChatMember]);

            toast.success(`Added ${selectedMember.firstName} to chat`);
            setShowConfirmDialog(false);
            setSelectedMember(null);
            setQuery("");
            setResults([]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to add member");
        } finally {
            setAdding(false);
        }
    };

    const handleCancelAdd = () => {
        setShowConfirmDialog(false);
        setSelectedMember(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px] p-4">
                    <DialogHeader>
                        <DialogTitle>Chat Members</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members..."
                                value={query}
                                onChange={handleSearchChange}
                                className="pl-8"
                            />
                            {query && results.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-auto">
                                    {results.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => handleSearchResultClick(member)}
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.avatar} />
                                                <AvatarFallback>
                                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {member.firstName} {member.lastName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {member.email}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {query && loading && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg p-4 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <ScrollArea className="h-[300px]">
                            {members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                    No members in this chat
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map((chatMember) => {
                                        const member = chatMember.user;
                                        const displayName = member?.name
                                            ? member.name
                                            : member?.email || "Unknown";
                                        const initials = member?.name?.[0] || member?.email?.[0] || "?";

                                        return (
                                            <div
                                                key={`${chatMember.chatId}-${chatMember.userId}`}
                                                className="flex items-center gap-3 p-2 hover:bg-muted transition-colors"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member?.image || undefined} />
                                                    <AvatarFallback>
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {displayName}
                                                    </span>
                                                    {member?.email && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {member.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Add {selectedMember?.firstName} {selectedMember?.lastName} to this chat?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelAdd}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAddMember}
                            disabled={adding}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {adding ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Adding...
                                </>
                            ) : (
                                "Add"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
