'use client'
import { Collapsible, CollapsibleTrigger, CollapsibleContent, CardTitle } from '@/components/ui'
import { CreateSubscription } from '.'
import { MemberSubItem } from './MemberSubItem'
import { Button } from '@/components/ui'
import { ChevronsUpDown } from 'lucide-react'
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
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className=' space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>Subscriptions</CardTitle>

                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>

                    </Button>
                </CollapsibleTrigger>
                <CreateSubscription params={params} refetch={() => { }} />
            </div>
            <CollapsibleContent>
                {subs && subs.length > 0 ? (
                    <div className="space-y-2">
                        {subs.map((sub: MemberSubscription) => (
                            <MemberSubItem key={sub.id} sub={sub} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="flex flex-col items-center justify-center">
                            <p className=" mb-1">No subscriptions found</p>
                            <p className="text-sm text-muted-foreground">
                                Create a subscription to get started
                            </p>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
