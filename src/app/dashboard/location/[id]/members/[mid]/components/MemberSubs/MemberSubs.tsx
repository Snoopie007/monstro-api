'use client'
import {
    CardTitle,
    Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from '@/components/ui'
import { CreateSubscription } from '.'
import { MemberSubItem } from './MemberSubItem'
import { Button } from '@/components/ui'
import { ChevronsUpDown, CircleFadingPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useMemberSubscriptions } from '@/hooks/hooks'
import { MemberSubscription } from '@/types'

interface MemberSubsProps {
    params: { id: string; mid: string }
}
export function MemberSubs({ params }: MemberSubsProps) {
    const [open, setOpen] = useState<boolean>(true)
    const { subs, isLoading, fetchSubs } = useMemberSubscriptions(params.id, params.mid)

    return (
        <div className='space-y-2'>
            <CreateSubscription params={params} refetch={() => { }} />
            <div>
                {subs && subs.length > 0 ? (
                    <div className="space-y-2">
                        {subs.map((sub: MemberSubscription) => (
                            <MemberSubItem key={sub.id} sub={sub} />
                        ))}
                    </div>
                ) : (
                    <Empty variant="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CircleFadingPlusIcon className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>No subscriptions found</EmptyTitle>
                            <EmptyDescription>Subscriptions will appear here when they are created</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </div>
    )
}
