'use client'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator,
} from '@/components/ui'
import { use, useState } from 'react'
import { toast } from 'react-toastify'
import { EllipsisVertical, Loader2, Pencil, Trash2 } from 'lucide-react'
import { MemberSubscription } from '@/types'
import { useParams } from 'next/navigation'
import { tryCatch } from '@/libs/utils'
import { auth } from '@/auth'

export default function MemberSubscriptionActions({ subscription }: { subscription: MemberSubscription }) {
    const { id: locationId, mid: memberId } = useParams()
    const [loading, setLoading] = useState(false)


    async function onCancel() {
        if (!subscription?.id) {
            toast.error('No subscription selected')
            return
        }


        const { error, result } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/plans/subs/${subscription.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriptionId: subscription.id })
                }
            )
        )


    }


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={'ghost'} size={'icon'} className='size-5'>
                    <EllipsisVertical className='size-4' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] bg-muted border-foreground/10 space-y-1'>
                <DropdownMenuItem
                    className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
                    onClick={onCancel}
                    disabled={!subscription}
                >
                    <span className='text-xs'> Update</span>
                    <Pencil className='size-3' />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
                    onClick={onCancel}
                    disabled={!subscription}
                >
                    <span className='text-xs'> Cancel</span>
                    <Trash2 className='size-3' />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}