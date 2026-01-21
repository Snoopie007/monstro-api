'use client'

import {
    Button, Skeleton, Tooltip, TooltipContent, TooltipTrigger,
    Avatar, AvatarImage
} from '@/components/ui'
import { formatAmountForDisplay, tryCatch } from '@/libs/utils'
import { MemberPackage } from '@/types/member'
import { format } from 'date-fns'
import { InfoField } from '../../../../../../../../components/ui/InfoField'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { cn } from '@/libs/utils'
import { FamilyDialog } from '../FamilyPlan'
import { PkgActions } from './PkgActions'
interface MemberPackageItemProps {
    pkg: MemberPackage
}



export function MemberPackageItem({ pkg }: MemberPackageItemProps) {
    const [familyPlans, setFamilyPlans] = useState<MemberPackage[] | null>(null)
    const [parentPlan, setParentPlan] = useState<MemberPackage | null>(null)
    const [loading, setLoading] = useState(false)
    const attended = pkg.totalClassAttended ?? 0
    const remaining = (pkg.totalClassLimit ?? 0) - attended

    const { locationId, memberId, plan, parentId } = pkg
    const canAddFamilyMember = useMemo(() => {
        if (!familyPlans || !plan?.familyMemberLimit) return false
        return plan?.familyMemberLimit > familyPlans?.length
    }, [familyPlans])


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


    const url = `/api/protected/loc/${locationId}/members/${memberId}/pkgs/${pkg.id}`

    async function fetchParentPlan() {
        setLoading(true)
        const { error, result } = await tryCatch(fetch(`${url}/parent?parentId=${pkg.id}`))
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

    return (
        <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-2">
            <div className="flex flex-row justify-between items-center">
                <div className="font-medium flex items-center gap-1.5 text-sm">
                    {pkg.plan?.name}
                </div>
                <PkgActions pkg={pkg} />
            </div>
            <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 items-center">
                    <InfoField label="Start Date">
                        {format(pkg.startDate, 'MMM d, yyyy')}
                    </InfoField>
                    <InfoField label="Expire Date">
                        {pkg.expireDate ? format(pkg.expireDate, 'MMM d, yyyy') : 'n/a'}
                    </InfoField>
                    <InfoField label="Remaining">
                        {remaining} classes
                    </InfoField>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <InfoField label="Price">
                        {pkg.pricing
                            ? formatAmountForDisplay(pkg.pricing.price / 100, pkg.pricing.currency || 'usd')
                            : 'N/A'
                        }
                        {pkg.pricing?.name && pkg.pricing.name !== 'Standard' && (
                            <span className="text-xs text-muted-foreground ml-1">({pkg.pricing.name})</span>
                        )}
                    </InfoField>
                    <InfoField label="Payment Type">
                        {pkg.paymentType || 'cash'}
                    </InfoField>
                    {/* Make-up Credits */}
                    {pkg.pricing?.plan?.makeUpCredits !== undefined && pkg.pricing.plan.makeUpCredits > 0 && (
                        <InfoField label="Make-up Credits">
                            {pkg.makeUpCredits} / {pkg.pricing.plan.makeUpCredits} used
                        </InfoField>
                    )}
                </div>
                {isFamilyPlan && isPayer && (
                    <div className={`space-y-1  col-span-1 `}>
                        <div className="text-xs font-medium text-muted-foreground">Family Plan Members</div>
                        <div className="flex flex-row items-center relative gap-2">
                            {loading ? (
                                <Skeleton className="size-6 rounded-lg" />
                            ) : (familyPlans && familyPlans.length > 0 && familyPlans.map((plan) => (
                                <FamilyPlanMember key={plan.id} plan={plan} />
                            )))}
                            {canAddFamilyMember && <FamilyDialog familyPlans={familyPlans || []} parentPlan={pkg} />}
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
        </div>
    )
}

function FamilyPlanMember({ plan }: { plan: MemberPackage }) {
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
