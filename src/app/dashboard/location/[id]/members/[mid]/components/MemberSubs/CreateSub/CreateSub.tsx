'use client'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
    Item,
    ItemContent,
    ItemMedia,
    ItemTitle
} from '@/components/ui'
import { useMemberSubscriptions, useSubscriptions } from '@/hooks'
import { MemberSubscription } from '@/types'
import { CircleFadingPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { VisuallyHidden } from 'react-aria'
import { SubForm } from './SubForm'

interface CreateSubscriptionProps {
    params: { id: string; mid: string }
}

export function CreateSubscription({ params }: CreateSubscriptionProps) {
    const [open, setOpen] = useState<boolean>(false)
    const { subscriptions } = useSubscriptions(params.id)
    const { mutate } = useMemberSubscriptions(params.id, params.mid)

    async function handleFinish(data: MemberSubscription) {
        setOpen(false)
        mutate()
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
