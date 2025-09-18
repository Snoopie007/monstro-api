'use client'

import { Button } from '@/components/ui'
import { SupportTrigger } from '@/types'
import { Edit2, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'sonner'
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
        onUpdate({...trigger, isActive: !trigger.isActive}, 'update')
    }

	const renderStatus = useMemo(() => {
		return trigger.isActive ? (
			<ToggleRight size={16} className="text-green-600" />
		) : (
			<ToggleLeft size={16} className="text-gray-400" />
		)
	}, [trigger.isActive])

    return (
        <div key={trigger.id}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{trigger.name}</p>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onClick={() => handleToggle()}
                        className="size-8"
                    >
                        {renderStatus}
                    </Button>
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onClick={handleEdit}
                        className="size-8 text-muted-foreground hover:text-foreground"
                    >
                        <Edit2 size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="size-8 text-muted-foreground hover:text-destructive"
                    >
                        {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
