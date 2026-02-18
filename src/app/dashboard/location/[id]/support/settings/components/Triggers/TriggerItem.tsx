'use client'

import { Button, Switch } from '@/components/ui'
import { SupportTrigger } from '@subtrees/types'
import { Edit2, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { useMemo, useState } from 'react'

interface TriggerItemProps {
    trigger: SupportTrigger
    onSelect: (trigger: SupportTrigger) => void
    onUpdate: (
        trigger: SupportTrigger | null,
        type: 'create' | 'update' | 'delete'
    ) => void
}

export function TriggerItem({ trigger, onSelect, onUpdate }: TriggerItemProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleEdit() {
        onSelect(trigger)
    }

    async function handleDelete() {
        if (!trigger) return
        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${trigger.supportAssistantId}/support/settings/triggers`,
                {
                    method: 'DELETE',
                    body: JSON.stringify({ id: trigger.id }),
                }
            )
        )
        if (error || !result || !result.ok) {
            return toast.error('Something went wrong')
        }
        toast.success('Trigger deleted')
        onUpdate(trigger, 'delete')
    }

    async function handleToggle() {
        if (!trigger) return
        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${trigger.supportAssistantId}/support/settings/triggers`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: trigger.id,
                        isActive: !trigger.isActive,
                    }),
                }
            )
        )
        if (error || !result || !result.ok) {
            return toast.error('Something went wrong')
        }
        toast.success('Trigger toggled')
        onUpdate({ ...trigger, isActive: !trigger.isActive }, 'update')
    }
    return (
        <div key={trigger.id}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{trigger.name}</p>
                <div className="flex items-center gap-2">
                    <Switch checked={trigger.isActive} onCheckedChange={handleToggle} />
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onClick={handleEdit}
                        className="size-6 text-muted-foreground hover:text-foreground"
                    >
                        <Edit2 size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="size-6 text-muted-foreground hover:text-destructive"
                    >
                        {isDeleting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Trash2 size={14} />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
