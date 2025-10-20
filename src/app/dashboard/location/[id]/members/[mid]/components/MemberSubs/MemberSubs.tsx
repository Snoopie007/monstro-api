'use client'
import { Input } from '@/components/forms'
import { useState } from 'react'
import { CreateSubscription } from '.'
import { MemberSubscriptionItems } from './MemberSubscriptionItems'
import { Button } from '@/components/ui'

export function MemberSubs({
    params,
}: {
    params: { id: string; mid: string }
}) {
    // const [search, setSearch] = useState<string>('')

    return (
        <div className="mb-4 px-4">
            <div className="flex flex-row items-center gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Subscriptions
                </h2>
                <CreateSubscription params={params} refetch={() => {}} />
            </div>
            <MemberSubscriptionItems params={params} />
        </div>
    )
}
