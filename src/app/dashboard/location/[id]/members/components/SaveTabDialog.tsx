'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/forms/input'

interface SaveTabDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (name: string) => void
    suggestedName: string
    disabled?: boolean
}

export function SaveTabDialog({
    open,
    onOpenChange,
    onSave,
    suggestedName,
    disabled = false,
}: SaveTabDialogProps) {
    const [name, setName] = useState('')

    useEffect(() => {
        if (open && suggestedName) {
            setName(suggestedName)
        }
    }, [open, suggestedName])

    const handleSave = () => {
        const trimmed = name.trim()
        if (trimmed) {
            onSave(trimmed)
            setName('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !disabled && name.trim()) {
            handleSave()
        }
        if (e.key === 'Escape') {
            onOpenChange(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setName('')
        }
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Save as Custom Tab</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <Input
                        placeholder="Tab name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        autoFocus
                    />
                    {disabled && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Maximum of 20 custom tabs reached
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={disabled || !name.trim()}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
