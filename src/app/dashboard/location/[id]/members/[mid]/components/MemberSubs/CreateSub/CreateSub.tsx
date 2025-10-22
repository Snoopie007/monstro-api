'use client'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle
} from '@/components/ui'
import { useState } from 'react'
import React from 'react'
import { SubForm } from './SubForm'
import { VisuallyHidden } from 'react-aria'
import { useSubscriptions } from '@/hooks'
import { MemberSubscription } from '@/types'
import { CircleFadingPlusIcon } from 'lucide-react'

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
                <Item variant="outline" size="sm" className="border-foreground/10 border-dashed cursor-pointer" >
                    <ItemMedia>
                        <CircleFadingPlusIcon className="size-5" />
                    </ItemMedia>
                    <ItemContent>
                        <ItemTitle>Add subscription</ItemTitle>
                    </ItemContent>

                </Item>
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
