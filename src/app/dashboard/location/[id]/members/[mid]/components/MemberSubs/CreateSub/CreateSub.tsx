'use client'
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui'
import { useState } from 'react'
import React from 'react'
import { SubForm } from './SubForm'
import { VisuallyHidden } from 'react-aria'
import { useSubscriptions } from '@/hooks'
import { MemberSubscription } from '@/types'
import { PlusIcon } from 'lucide-react'

export function CreateSubscription({
    params,
    refetch,
}: {
    params: { id: string; mid: string }
    refetch: () => void
}) {
    const [open, setOpen] = useState<boolean>(false)
    const { subscriptions } = useSubscriptions(params.id)

    async function handleFinish(data: MemberSubscription) {
        setOpen(false)
        refetch()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="size-6 rounded-sm"
                >
                    <PlusIcon className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <SubForm
                    lid={params.id}
                    subs={subscriptions || []}
                    mid={params.mid}
                    onFinish={handleFinish}
                />
            </DialogContent>
        </Dialog>
    )
}
