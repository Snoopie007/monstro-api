'use client'

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Message } from "@subtrees/types/vendor/social/chat";

interface MessageActionsDropdownProps {
    message: Message;
    onEdit: () => void;
    onDelete: () => void;
}

export function MessageActionsDropdown({ message, onEdit, onDelete }: MessageActionsDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreVertical className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="cursor-pointer"
                >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Message
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Message
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

