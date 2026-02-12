'use client'

import { Avatar, CircleProgress, Skeleton, TooltipContent, TooltipTrigger, Tooltip, AvatarImage } from '@/components/ui'
import { cn, formatAmountForDisplay, tryCatch } from '@/libs/utils'
import type { MemberSubscription } from '@subtrees/types'
import { format } from 'date-fns'
import { SubActions } from './SubActions'
import { Clock4Icon } from 'lucide-react'
import { InfoField } from '../../../../../../../../components/ui/InfoField'
import { useEffect, useMemo, useState } from 'react'

import { FamilyDialog } from '../FamilyPlan'
import { toast } from 'react-toastify'

function calculateProgress(start: Date, end: Date) {
    const now = Date.now()
    const startDate = new Date(start)
    const endDate = new Date(end)
    const total = endDate.getTime() - startDate.getTime()
    const elapsed = now - startDate.getTime()
    const progress = (elapsed / total) * 100

    return Math.min(Math.max(Number(progress.toFixed(2)), 10), 100)
}

const StatusStringMap = {
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    paused: 'Paused',
    expired: 'Expired',
    trial: 'Trial',
    trial_ended: 'Trial Ended',
    trial_expired: 'Trial Expired',
}



export function MemberSubItem({ sub }: { sub: MemberSubscription }) {

    const [familyPlans, setFamilyPlans] = useState<MemberSubscription[] | null>(null)
    const [parentPlan, setParentPlan] = useState<MemberSubscription | null>(null)
    const [loading, setLoading] = useState(false)
    const { locationId, memberId, plan, parentId } = sub

    const isFamilyPlan = plan?.family
    const isPayer = parentId === null
    const canAddFamilyMember = useMemo(() => {
        if (!familyPlans || !sub.plan?.familyMemberLimit) return false
        return sub.plan?.familyMemberLimit > familyPlans?.length
    }, [familyPlans])

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



    const url = `/api/protected/loc/${locationId}/members/${memberId}/subs/${sub.id}`

    async function fetchParentPlan() {
        setLoading(true)
        const { error, result } = await tryCatch(fetch(`${url}/parent?parentId=${sub.id}`))
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
        const { error, result } = await tryCatch(fetch(`${url}/childs`))
        if (error || !result || !result.ok) {
            setLoading(false)
            return toast.error(error?.message || 'Failed to fetch family plans')
        }
        const data = await result?.json()
        setFamilyPlans(data)
        setLoading(false)
    }


    function getPaymentType(paymentType: string) {
        switch (paymentType) {
            case 'card':
                return 'Credit Card'
            case 'us_bank_account':
                return 'ACH'
            case 'paypal':
                return 'PayPal'
            case 'apple_pay':
                return 'Apple Pay'
            case 'google_pay':
                return 'Google Pay'
            case 'manual':
                return 'Manual'
        }
        return paymentType
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
                        {sub.pricing 
                            ? `${formatAmountForDisplay(sub.pricing.price / 100, sub.pricing.currency || 'usd', true)} / ${sub.pricing.interval || 'one-time'}`
                            : 'N/A'
                        }
                        {sub.pricing?.name && sub.pricing.name !== 'Standard' && (
                            <span className="text-xs text-muted-foreground ml-1">({sub.pricing.name})</span>
                        )}
                    </InfoField>
                    <InfoField label="Payment Type">
                        {getPaymentType(sub.paymentType)}
                    </InfoField>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <InfoField label="Next Billing Date">
                        {format(sub.currentPeriodEnd, 'MMM d, yyyy')}
                    </InfoField>
                    <InfoField label="Status">
                        <span className="flex items-center gap-2">
                            <StatusDot status={sub.status} /> {StatusStringMap[sub.status as keyof typeof StatusStringMap]}
                        </span>
                    </InfoField>
                    <InfoField label="Trial Ends">
                        {sub.trialEnd ? format(sub.trialEnd!, 'MMM d, yyyy') : 'n/a'}
                    </InfoField>
                </div>

                {/* Make-up Credits */}
                {sub.pricing?.plan?.makeUpCredits !== undefined && sub.pricing.plan.makeUpCredits > 0 && (
                    <div className="grid grid-cols-3 items-center">
                        <InfoField label="Make-up Credits">
                            <span className="flex items-center gap-1">
                                {sub.makeUpCredits} / {sub.pricing.plan.makeUpCredits} used
                            </span>
                        </InfoField>
                    </div>
                )}

                {sub.cancelAt && (
                    <div className="grid grid-cols-3 items-center">
                        {sub.cancelAt && sub.cancelAtPeriodEnd && (
                            <InfoField label="Cancels at">
                                <span className="flex items-center gap-1">
                                    <Clock4Icon size={14} /> {format(sub.cancelAt, "MMM d, yyyy")}
                                </span>
                            </InfoField>
                        )}
                        {!sub.cancelAtPeriodEnd && (
                            <InfoField label="Ends at">
                                <span className="flex items-center gap-1">
                                    <Clock4Icon size={14} /> {format(sub.cancelAt, "MMM d, yyyy")}
                                </span>
                            </InfoField>
                        )}
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
                            {canAddFamilyMember && <FamilyDialog parentPlan={sub} />}
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

    async function removeFamilyPlant(planId: string) {

    }
    return (
        <Tooltip>
            <TooltipTrigger asChild>

                <Avatar className={cn("size-6 rounded-lg bg-foreground/5 ")} >
                    <AvatarImage src={fm?.user?.image || '/images/default-avatar.png'} />
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
