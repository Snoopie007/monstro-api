"use client";

import { Button } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { POST_REACTIONS, POST_QUICK_REACTIONS, toEmojiData } from "@/constants/emojis";
import { cn } from "@/libs/utils";
import { SmilePlus } from "lucide-react";
import { useState } from "react";

type EmojiData = {
    value: string;
    name: string;
    type: string;
};

type ReactionPickerProps = {
    onSelect: (emoji: EmojiData) => void;
    isUpdating?: boolean;
    triggerClassName?: string;
    size?: "sm" | "md";
};

export function ReactionPicker({
    onSelect,
    isUpdating = false,
    triggerClassName,
    size = "md",
}: ReactionPickerProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (emoji: typeof POST_REACTIONS[number]) => {
        onSelect(toEmojiData(emoji.display, emoji.name));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size={size === "sm" ? "xs" : "sm"}
                    className={cn(
                        "text-muted-foreground hover:text-foreground",
                        size === "sm" ? "h-6 px-2" : "h-8 px-3",
                        triggerClassName
                    )}
                    disabled={isUpdating}
                >
                    <SmilePlus className={cn(
                        size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-auto p-1.5 bg-popover/95 backdrop-blur-sm border-border/50" 
                align="start"
                side="top"
                sideOffset={8}
            >
                <div className="flex flex-wrap gap-0.5 max-w-[220px]">
                    {POST_REACTIONS.map((emoji) => (
                        <button
                            key={emoji.name}
                            onClick={() => handleSelect(emoji)}
                            className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-md",
                                "hover:bg-accent hover:scale-125 transition-all duration-150",
                                "text-xl"
                            )}
                            title={emoji.name}
                        >
                            {emoji.display}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Inline quick reaction bar (for use in post footers, etc.)
// Shows only thumbs up and fire
type QuickReactionsProps = {
    onSelect: (emoji: EmojiData) => void;
    isUpdating?: boolean;
    showPicker?: boolean;
};

export function QuickReactions({
    onSelect,
    isUpdating = false,
    showPicker = true,
}: QuickReactionsProps) {
    return (
        <div className="flex items-center gap-0.5">
            {POST_QUICK_REACTIONS.map((emoji) => (
                <button
                    key={emoji.name}
                    onClick={() => onSelect(toEmojiData(emoji.display, emoji.name))}
                    disabled={isUpdating}
                    className={cn(
                        "p-1 rounded hover:bg-accent transition-colors text-lg",
                        "hover:scale-110 transition-transform",
                        isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                    title={emoji.name}
                >
                    {emoji.display}
                </button>
            ))}
            {showPicker && (
                <ReactionPicker onSelect={onSelect} isUpdating={isUpdating} size="sm" />
            )}
        </div>
    );
}
