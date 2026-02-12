"use client";

import { Button } from "@/components/ui";
import { ReactionCount, ReactionEmoji } from "@subtrees/types/vendor/social";
import { cn } from "@/libs/utils";
import { SmilePlus } from "lucide-react";

type ChatReactionsProps = {
  reactions?: ReactionCount[];
  currentUserId?: string;
  onToggleReaction: (emoji: ReactionEmoji) => void;
  onOpenPicker: () => void;
  isUpdating?: boolean;
};

export function ChatReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  onOpenPicker,
  isUpdating = false,
}: ChatReactionsProps) {
  if (!reactions || reactions.length === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenPicker();
        }}
        disabled={isUpdating}
        className={cn(
          "p-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10",
          "flex items-center gap-1 transition-colors",
          isUpdating && "opacity-50 cursor-not-allowed"
        )}
        title="Add reaction"
      >
        <SmilePlus className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((reaction) => {
        const hasReacted = currentUserId && reaction.userIds?.includes(currentUserId);

        return (
          <button
            key={reaction.display}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction({
                value: reaction.display,
                name: reaction.name,
                type: 'emoji'
              });
            }}
            disabled={isUpdating}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full",
              "text-sm transition-colors",
              hasReacted
                ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                : "bg-foreground/5 hover:bg-foreground/10",
              isUpdating && "opacity-50 cursor-not-allowed"
            )}
            title={reaction.userNames?.join(', ') || reaction.name}
          >
            <span className="text-lg leading-none">{reaction.display}</span>
            <span className="font-medium">{reaction.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenPicker();
        }}
        disabled={isUpdating}
        className={cn(
          "p-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10",
          "flex items-center gap-1 transition-colors",
          isUpdating && "opacity-50 cursor-not-allowed"
        )}
        title="Add reaction"
      >
        <SmilePlus className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

