import { Button } from "@/components/ui/button";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChatMember } from "@/types/chats";
import { EllipsisVertical, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { ChatMembersDialog } from "./AddMemberDialog";

    export function ChatActions({ 
        lid, 
        chatId, 
        chatMembers 
    }: { 
        lid: string; 
        chatId: string;
        chatMembers?: ChatMember[];
    }) {
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} size="icon" className="size-6 bg-foreground/5">
                    <EllipsisVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] border-foreground/20">
                <DropdownMenuItem className="cursor-pointer flex flex-row items-center justify-between" onSelect={() => setShowAddMemberDialog(true)}>
                    <span>Add Member</span>
                    <UserPlusIcon className="size-4" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <ChatMembersDialog 
            open={showAddMemberDialog} 
            onOpenChange={setShowAddMemberDialog} 
            lid={lid}
            chatId={chatId}
            chatMembers={chatMembers}
        />
        </>
    )
}