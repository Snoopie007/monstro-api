'use client'

import { Message } from "@subtrees/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";

interface EditableMessageProps {
    message: Message;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (content: string) => void;
    onCancel: () => void;
}

export function EditableMessage({
    message,
    isEditing,
    onStartEdit,
    onSave,
    onCancel,
}: EditableMessageProps) {
    const [editContent, setEditContent] = useState(message.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset content when message changes or editing starts
    useEffect(() => {
        if (isEditing) {
            setEditContent(message.content);
            // Focus and select textarea after a brief delay to ensure it's rendered
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.select();
                }
            }, 0);
        }
    }, [isEditing, message.content]);

    // Auto-resize textarea
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [editContent, isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleSave = () => {
        if (!editContent) return;
        if (editContent.trim() !== message.content) {
            onSave(editContent.trim());
        } else {
            // No changes, just cancel
            onCancel();
        }
    };

    const handleCancel = () => {
        setEditContent(message.content);
        onCancel();
    };

    if (isEditing) {
        return (
            <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed">
                <textarea
                    ref={textareaRef}
                    value={editContent || ''}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full min-h-[40px] max-h-[200px] px-3 py-2 text-sm bg-muted/50 border border-foreground/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    rows={1}
                    style={{ fontFamily: 'inherit' }}
                />
                <div className="text-xs text-muted-foreground mt-1">
                    Press Enter to save, Esc to cancel
                </div>
            </div>
        );
    }

    return (
        <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed">
            <ReactMarkdown>
                {message.content}
            </ReactMarkdown>
        </div>
    );
}

