import {
    ScrollArea,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    TooltipProvider,
} from '@/components/ui'

import {
    MemberChatView,
    MemberInvoiceItems,
    MemberAchievementItems,
    MemberRewardItems,
    MemberAttendanceItems,
    MemberSubs,
    MemberFamilies,
    MemberTransactionItems,
    MemberPackages,
} from './components'

import { PaymentMethods, MemberProfile } from './components'
import { db } from '@/db/db'
import { and, eq, or, desc } from 'drizzle-orm'
import { MemberProvider } from './providers/MemberContext'
import { Member, MemberLocation } from '@/types'
import Stripe from 'stripe'
import { MemberStripePayments } from '@/libs/server/stripe'
import { CustomFieldsSection } from '@/components/custom-fields'
import { MemberTagSection } from './components/MemberTagsSection'
import { attendances, reservations, recurringReservations } from '@/db/schemas'
import { format } from 'date-fns'
import { hasPermission } from '@/libs/server/permissions'

type PromiseReturnType = {
    member: Member | undefined
    ml: MemberLocation | undefined
}

type MemberProfileData = {
    totalPointsEarned: number
    lastSeenFormatted: string
}

async function fetchStripeKeys(
    id: string,
    mid: string
): Promise<PromiseReturnType | null> {
    if (!id || !mid) {
        return null
    }

    try {
        const ml = await db.query.memberLocations.findFirst({
            where: (ml, { eq }) =>
                and(eq(ml.memberId, mid), eq(ml.locationId, id)),
            with: {
                member: {
                    with: {
                        familyMembers: {
                            with: {
                                relatedMember: true,
                            },
                        },
                        subscriptions: {
                            where: (ms, { eq, and }) =>
                                and(
                                    eq(ms.memberId, mid),
                                    eq(ms.locationId, id)
                                ),
                            with: {
                                plan: {
                                    with: {
                                        planPrograms: {
                                            with: {
                                                program: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!ml) {
            throw new Error('Member  not found')
        }
        const { member, ...rest } = ml

        return { member, ml: rest }
    } catch (error) {
        console.log('error', error)
        return null
    }
}

async function fetchMemberProfileData(
    id: string,
    mid: string,
    currentPoints: number = 0
): Promise<MemberProfileData> {
    try {
        // Fetch latest check-in
        const latestCheckIn = await db
            .select({
                checkInTime: attendances.checkInTime,
            })
            .from(attendances)
            .leftJoin(
                reservations,
                eq(attendances.reservationId, reservations.id)
            )
            .leftJoin(
                recurringReservations,
                eq(attendances.recurringId, recurringReservations.id)
            )
            .where(
                and(
                    or(
                        and(
                            eq(reservations.memberId, mid),
                            eq(reservations.locationId, id)
                        ),
                        and(
                            eq(recurringReservations.memberId, mid),
                            eq(recurringReservations.locationId, id)
                        )
                    )
                )
            )
            .orderBy(desc(attendances.checkInTime))
            .limit(1)

        // Fetch reward claims for points calculation
        const rewardClaims = await db.query.memberRewards.findMany({
            where: (memberRewards, { eq }) => eq(memberRewards.memberId, mid),
        })

        // Calculate total points earned
        const pointsSpent = rewardClaims.reduce((total, claim) => {
            return (
                total +
                (claim.previousPoints
                    ? claim.previousPoints - currentPoints
                    : 0)
            )
        }, 0)

        const totalPointsEarned = currentPoints + Math.abs(pointsSpent)

        // Format last seen date
        const latestCheckInDate = latestCheckIn[0]?.checkInTime
        const lastSeenFormatted = latestCheckInDate
            ? format(new Date(latestCheckInDate), "MMM d, yyyy 'at' h:mm a")
            : 'Never'

        return {
            totalPointsEarned,
            lastSeenFormatted,
        }
    } catch (error) {
        console.error('Error fetching member profile data:', error)
        return {
            totalPointsEarned: currentPoints,
            lastSeenFormatted: 'Never',
        }
    }
}

async function fetchStripePaymentMethods(
    customerId: string
): Promise<Stripe.PaymentMethod[]> {
    try {
        const stripe = new MemberStripePayments()
        const paymentMethods = await stripe.getPaymentMethods(customerId, 25)
        return paymentMethods.data
    } catch (error) {
        console.log('error', error)
        return []
    }
}



const triggerTabsClassName =
    'bg-background data-[state=active]:text-foreground data-[state=active]:bg-foreground/10 data-[state=active]:border-primary dark:data-[state=active]:border-primary h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none'

export default async function MemberProfilePage(props: {
    params: Promise<{ id: string; mid: string }>
}) {
    const params = await props.params
    const canEditMember = await hasPermission('edit member', params.id)

    const res = await fetchStripeKeys(params.id, params.mid)

    let paymentMethods: Stripe.PaymentMethod[] = []

    if (!res || !res.member || !res.ml) {
        return <div>Member not found</div>
    }
    const { member, ml } = res

    // Fetch member profile data (check-ins and reward claims)
    const memberProfileData = await fetchMemberProfileData(
        params.id,
        params.mid,
        ml.points || 0
    )

    if (member.stripeCustomerId) {
        paymentMethods = await fetchStripePaymentMethods(
            member.stripeCustomerId
        )
    }

    return (
        <div className="h-full flex flex-col">
            <TooltipProvider>
                <MemberProvider
                    member={member}
                    paymentMethods={paymentMethods}
                    ml={ml}
                >
                    <div className="grid grid-cols-12 flex-1 gap-4 px-3 py-2 min-h-0">
                        <div className="col-span-4 border-foreground/10 flex flex-col">
                            <MemberProfile
                                params={params}
                                profileData={memberProfileData}
                            />
                            <ScrollArea className="flex-1 min-h-0">

                                <div className='space-y-2'>
                                    <MemberFamilies
                                        params={params}
                                        familyMembers={member.familyMembers}
                                        editable={canEditMember}
                                    />
                                    <MemberTagSection
                                        editable={canEditMember}
                                        params={params}
                                    />
                                    <PaymentMethods
                                        editable={canEditMember}
                                        params={params}
                                    />
                                    <CustomFieldsSection
                                        memberId={params.mid}
                                        locationId={params.id}
                                        editable={canEditMember}
                                        variant="card"
                                        showEmptyFields={true}
                                    />
                                    <MemberPackages params={params} />
                                    <MemberSubs params={params} />
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="col-span-5 flex flex-col">
                            <div className="bg-foreground/5 rounded-lg flex-1 min-h-0">
                                <MemberChatView />
                            </div>
                        </div>

                        <div className="col-span-3 py-4 pr-4 flex flex-col">
                            <Tabs defaultValue="invoices-transactions" className="h-full flex flex-col">
                                <TabsList className="bg-background rounded-none border-b p-0 w-full items-start justify-start overflow-x-scroll">
                                    <TabsTrigger
                                        value="invoices-transactions"
                                        className={triggerTabsClassName}
                                    >
                                        Invoices & Transactions
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="achievements-rewards"
                                        className={triggerTabsClassName}
                                    >
                                        Achievements & Rewards
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="attendance"
                                        className={triggerTabsClassName}
                                    >
                                        Attendance
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="invoices-transactions" className="flex-1 min-h-0 overflow-hidden">
                                    <div className="h-full overflow-y-auto space-y-4">
                                        <MemberInvoiceItems params={params} />
                                        <MemberTransactionItems
                                            params={params}
                                        />
                                    </div>
                                </TabsContent>
                                <TabsContent value="achievements-rewards" className="flex-1 min-h-0 overflow-hidden">
                                    <div className="h-full overflow-y-auto space-y-4">
                                        <MemberAchievementItems
                                            params={params}
                                        />
                                        <MemberRewardItems params={params} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="attendance" className="flex-1 min-h-0 overflow-hidden">
                                    <div className="h-full overflow-y-auto">
                                        <MemberAttendanceItems
                                            params={params}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </MemberProvider>
            </TooltipProvider>
        </div>
    )
}
