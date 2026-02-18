'use client'
import {
    Empty, EmptyHeader, EmptyMedia,
    EmptyTitle, EmptyDescription,
    Skeleton,
} from '@/components/ui'
import { CreateSubscription } from '.'
import { MemberSubItem } from './MemberSubItem'
import { CircleFadingPlusIcon } from 'lucide-react'
import { useMemberSubscriptions } from '@/hooks/hooks'
import { MemberSubscription } from '@subtrees/types'

interface MemberSubsProps {
    params: { id: string; mid: string }
}
export function MemberSubs({ params }: MemberSubsProps) {
    const { subs, isLoading, mutate } = useMemberSubscriptions(params.id, params.mid)

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }
    return (
        <div className='space-y-2'>
            <CreateSubscription params={params} />
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
