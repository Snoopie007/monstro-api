"use client";

import { ReactionCount } from "@/types/groups";
import { EmojiData } from "@/types/chats";
import { cn } from "@/libs/utils";

type ReactionBarProps = {
    reactions: ReactionCount[];
    currentUserId?: string;
    onToggleReaction: (emoji: EmojiData) => void;
    isUpdating?: boolean;
    size?: "sm" | "md";
};

export function ReactionBar({
    reactions,
    currentUserId,
    onToggleReaction,
    isUpdating = false,
    size = "md",
}: ReactionBarProps) {
    if (reactions.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1">
            {reactions.map((reaction) => {
                const hasReacted = currentUserId && reaction.userIds?.includes(currentUserId);
                
                return (
                    <button
                        key={`${reaction.display}-${reaction.name}`}
                        onClick={() => onToggleReaction({
                            value: reaction.display,
                            name: reaction.name,
                            type: reaction.type,
                        })}
                        disabled={isUpdating}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full transition-colors",
                            hasReacted 
                                ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30" 
                                : "bg-foreground/5 hover:bg-foreground/10",
                            size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1",
                            isUpdating && "opacity-50 cursor-not-allowed"
                        )}
                        title={reaction.userNames?.join(", ") || ""}
                    >
                        <span className={cn(
                            size === "sm" ? "text-sm" : "text-base"
                        )}>
                            {reaction.display}
                        </span>
                        <span className={cn(
                            "font-medium text-muted-foreground",
                            size === "sm" ? "text-xs" : "text-sm"
                        )}>
                            {reaction.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

