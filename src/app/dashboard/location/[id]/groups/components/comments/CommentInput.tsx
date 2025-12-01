"use client";

import { Button } from "@/components/ui";
import { PostComment } from "@/types/groups";
import { X, Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type CommentInputProps = {
    onSubmit: (content: string, parentId?: string) => Promise<void>;
    replyingTo?: PostComment | null;
    onCancelReply?: () => void;
    isSubmitting?: boolean;
    placeholder?: string;
};

export function CommentInput({
    onSubmit,
    replyingTo,
    onCancelReply,
    isSubmitting = false,
    placeholder = "Write a comment...",
}: CommentInputProps) {
    const [content, setContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus on textarea when replying to someone
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyingTo]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
        }
    }, [content]);

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;

        try {
            await onSubmit(content.trim(), replyingTo?.id);
            setContent("");
            if (replyingTo && onCancelReply) {
                onCancelReply();
            }
        } catch (error) {
            console.error("Failed to submit comment:", error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Submit on Cmd/Ctrl + Enter
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-foreground/5 pt-3">
            {/* Reply indicator */}
            {replyingTo && (
                <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-muted-foreground">
                        Replying to{" "}
                        <span className="font-medium text-foreground">
                            @{replyingTo.user?.name ?? "Unknown"}
                        </span>
                    </span>
                    <Button
                        variant="ghost"
                        size="xs"
                        className="h-5 w-5 p-0"
                        onClick={onCancelReply}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Input area */}
            <div className="flex gap-2 flex-row items-end">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={replyingTo ? `Reply to @${replyingTo.user?.name ?? "Unknown"}...` : placeholder}
                        className="w-full min-h-[40px] max-h-[150px] px-3 py-2 text-sm bg-muted/50 border border-foreground/5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        rows={1}
                        disabled={isSubmitting}
                    />
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    className="h-10 px-3"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}

