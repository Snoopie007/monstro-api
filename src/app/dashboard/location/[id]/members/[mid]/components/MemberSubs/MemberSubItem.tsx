'use client'

import { Avatar, Button, CircleProgress, Skeleton, TooltipContent, TooltipTrigger, Tooltip, AvatarImage } from '@/components/ui'
import { cn, formatAmountForDisplay, tryCatch } from '@/libs/utils'
import { MemberSubscription } from '@/types'
import { format } from 'date-fns'
import { SubActions } from './SubActions'
import { PlusIcon, Clock4Icon } from 'lucide-react'
import { InfoField } from '../InfoField'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

function calculateProgress(start: Date, end: Date) {
    const now = Date.now()
    const startDate = new Date(start)
    const endDate = new Date(end)
    const total = endDate.getTime() - startDate.getTime()
    const elapsed = now - startDate.getTime()
    const progress = (elapsed / total) * 100

    return Math.min(Math.max(Number(progress.toFixed(2)), 10), 100)
}



export function MemberSubItem({ sub }: { sub: MemberSubscription }) {

    const [familyPlans, setFamilyPlans] = useState<MemberSubscription[] | null>(null)
    const [parentPlan, setParentPlan] = useState<MemberSubscription | null>(null)
    const [loading, setLoading] = useState(false)
    const { locationId, memberId, plan, parentId } = sub
    const isFamilyPlan = plan?.family
    const isPayer = parentId === null

    useEffect(() => {
        if (!isFamilyPlan) return
        if (isPayer) {
            if (familyPlans && familyPlans.length > 0) return
            fetchFamilyPlans()
        } else {
            if (parentPlan) return
            fetchParentPlan()
        }
    }, [isFamilyPlan, isPayer])

    async function fetchParentPlan() {
        setLoading(true)
        const url = `/api/protected/loc/${locationId}/members/${memberId}/subs/${sub.id}/parent?parentId=${sub.id}`
        const { error, result } = await tryCatch(fetch(url))
        if (error || !result || !result.ok) {
            setLoading(false)
            return toast.error(error?.message || 'Failed to fetch parent plan')
        }
        const data = await result?.json()
        setParentPlan(data)
        setLoading(false)
    }

    async function fetchFamilyPlans() {
        setLoading(true)
        const url = `/api/protected/loc/${locationId}/members/${memberId}/subs/${sub.id}/childs`
        const { error, result } = await tryCatch(fetch(url))
        if (error || !result || !result.ok) {
            setLoading(false)
            return toast.error(error?.message || 'Failed to fetch family plans')
        }
        const data = await result?.json()
        setFamilyPlans(data)
        setLoading(false)
    }
    return (
        <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-2">
            <div className="flex flex-row justify-between items-center">
                <div className="font-medium flex items-center gap-1.5">
                    <div className="relative size-5">
                        <CircleProgress
                            progress={calculateProgress(
                                sub.currentPeriodStart,
                                sub.currentPeriodEnd
                            )}
                        />
                    </div>
                    <span className="font-bold text-sm">
                        {sub.plan?.name}
                    </span>

                </div>
                <SubActions sub={sub} />
            </div>
            <div className="space-y-5 py-2">
                <div className="grid grid-cols-3 justify-between items-center">
                    <InfoField label="Duration">
                        {`${format(sub.startDate, 'MMM d, yyyy')} - ${sub.endedAt ? format(sub.endedAt, 'MMM d, yyyy') : 'n/a'}`}
                    </InfoField>
                    <InfoField label="Price">
                        {`${formatAmountForDisplay(sub.plan?.price! / 100, 'usd', true)} / ${sub.plan?.interval}`}
                    </InfoField>
                    <InfoField label="Payment Method">
                        {sub.paymentMethod}
                    </InfoField>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <InfoField label="Next Billing Date">
                        {format(sub.currentPeriodEnd, 'MMM d, yyyy')}
                    </InfoField>
                    <InfoField label="Status">
                        <span className="flex items-center gap-2">
                            <StatusDot status={sub.status} /> {sub.status}
                        </span>
                    </InfoField>
                    <InfoField label="Trial Ends">
                        {sub.trialEnd ? format(sub.trialEnd!, 'MMM d, yyyy') : 'n/a'}
                    </InfoField>
                </div>

                {sub.cancelAt && sub.cancelAtPeriodEnd && (
                    <div className="grid grid-cols-3 items-center">
                        <InfoField label="Cancels at">
                            <span className="flex items-center gap-1">
                                <Clock4Icon size={14} /> {format(sub.cancelAt, "MMM d, yyyy")}
                            </span>
                        </InfoField>
                    </div>
                )}

                {isFamilyPlan && isPayer && (
                    <div className={`space-y-1  col-span-1 `}>
                        <div className="text-xs font-medium text-muted-foreground">Family Plan Members</div>
                        <div className="flex flex-row items-center relative gap-2">
                            {loading ? (
                                <Skeleton className="size-6 rounded-lg" />
                            ) : (familyPlans && familyPlans.length > 0 && familyPlans.map((plan) => (
                                <FamilyPlanMember key={plan.id} plan={plan} />
                            )))}
                            <Button variant="ghost" size="icon" className="size-6 bg-foreground/10 rounded-lg">
                                <PlusIcon size={14} className="text-foreground/50" />
                            </Button>
                        </div>
                    </div>
                )}

                {parentPlan && (
                    <div className={`space-y-1  col-span-1 `}>
                        <div className="text-xs font-medium text-muted-foreground">Parent Plan Owner </div>
                        <div className="text-sm font-medium">
                            {parentPlan?.member?.firstName} {parentPlan?.member?.lastName}
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}

function FamilyPlanMember({ plan }: { plan: MemberSubscription }) {
    const fm = plan.member
    return (
        <Tooltip>
            <TooltipTrigger asChild>

                <Avatar className={cn("size-6 rounded-lg bg-foreground/5 ")} >
                    <AvatarImage src={fm?.avatar || '/images/default-avatar.png'} />
                </Avatar>
            </TooltipTrigger>
            <TooltipContent>
                <div className="text-sm font-medium">{fm?.firstName} {fm?.lastName}</div>
            </TooltipContent>
        </Tooltip>

    )
}



function StatusDot({ status }: { status: string }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500'
            case 'paused':
                return 'bg-yellow-500'
            case 'canceled':
                return 'bg-red-500'
            case 'incomplete':
                return 'bg-orange-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className={`size-2.5 rounded-full ${getStatusColor(status)}`} />
    )
}