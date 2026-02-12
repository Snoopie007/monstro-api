'use client'

import React, { useState } from 'react'
import { Button, ScrollArea } from '@/components/ui'
import { Loader2, MessageSquare, Trash2 } from 'lucide-react'
import { QAEntry } from '@subtrees/types/KnowledgeBase'

interface QAEntryListProps {
    entries: QAEntry[]
    onDelete: (entryId: string) => void
}

export function QAEntryList({ entries, onDelete }: QAEntryListProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const truncateText = (text: string, limit: number = 100) => {
        if (text.length <= limit) return text
        return text.substring(0, limit) + '...'
    }

    const handleDelete = async (entryId: string) => {
        setIsDeleting(true)
        await onDelete(entryId)
        setIsDeleting(false)
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-8">
                <MessageSquare
                    size={16}
                    className="mx-auto text-muted-foreground mb-2"
                />
                <p className="text-sm font-medium">No Q&A entries yet</p>
                <p className="text-xs text-muted-foreground">
                    Click "Add Q&A Entry" above to get started
                </p>
            </div>
        )
    }

    return (
        <ScrollArea className="max-h-[50vh] overflow-y-auto py-2">
            <div className="space-y-3">
                {entries.map((entry, index) => {
                    return (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-2"
                        >
                            <p className="text-sm font-medium leading-relaxed">
                                {truncateText(entry.question, 30)}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(entry.id)}
                                    className="size-8 p-0 text-red-600 focus:text-red-600"
                                    title="Delete entry"
                                    disabled={isDeleting}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
    )
}
