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
    MemberInvoice,
    MemberSubs,
    MemberFamilies,
    MemberTransactions,
    MemberPkg,
    CustomFieldsBox,
    MemberTagsBox,
    MemberRewards,
    MemberAchievements,
} from './components'

import { PaymentMethods, MemberProfile, PointsProfile } from './components'
import { db } from '@/db/db'
import { and, eq, or, desc } from 'drizzle-orm'
import { MemberProvider } from './providers/MemberContext'
import { Member, MemberLocation } from '@/types'
import Stripe from 'stripe'
import { MemberStripePayments } from '@/libs/server/stripe'

import { attendances, reservations, recurringReservations } from '@/db/schemas'
import { format } from 'date-fns'
import { hasPermission } from '@/libs/server/permissions'
import { MemberAttendanceGraph } from './components/MemberAttendance/MemberAttendanceGraph'

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
            where: (ml, { eq }) => and(eq(ml.memberId, mid), eq(ml.locationId, id)),
            with: {
                member: {
                    with: {
                        familyMembers: {
                            with: {
                                relatedMember: true,
                            },
                        },
                        subscriptions: {
                            where: (ms, { eq }) => eq(ms.locationId, id),
                            with: {
                                plan: true,
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
        <TooltipProvider>
            <MemberProvider
                member={member}
                ml={ml}
                paymentMethods={paymentMethods}
            >
                <div className="grid grid-cols-7 flex-1 gap-2 p-2 h-full">
                    <div className="col-span-2 flex flex-col space-y-2 h-full">
                        <MemberProfile params={params} pd={memberProfileData} />
                        <PointsProfile profileData={memberProfileData} />
                        <ScrollArea className="h-[calc(100vh-318px)] overflow-hidden">
                            <div className="space-y-4 ">
                                <MemberAttendanceGraph params={params} />
                                <MemberFamilies
                                    params={params}
                                    familyMembers={member.familyMembers}
                                    editable={canEditMember}
                                />
                                <MemberTagsBox
                                    editable={canEditMember}
                                    params={params}
                                />
                                <CustomFieldsBox
                                    memberId={params.mid}
                                    locationId={params.id}
                                    editable={canEditMember}
                                    variant="card"
                                    showEmptyFields={true}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="col-span-3 flex flex-col h-full">
                        <MemberChatView />
                    </div>

                    <div className="col-span-2 h-full">
                        <ScrollArea className="flex-1 h-full  overflow-hidden">
                            <div className="space-y-4 pb-10">
                                <Tabs
                                    defaultValue="subscriptions"
                                    className="flex-1 flex flex-col min-h-0"
                                >
                                    <TabsList className="bg-transparent rounded-none p-0 justify-start gap-1 flex-shrink-0">
                                        {['subscriptions', 'packages'].map(
                                            (tab) => (
                                                <TabsTrigger
                                                    key={tab}
                                                    value={tab}
                                                    className="bg-foreground/5 text-xs capitalize rounded-full"
                                                >
                                                    {tab}
                                                </TabsTrigger>
                                            )
                                        )}
                                    </TabsList>
                                    <TabsContent value="subscriptions">
                                        <MemberSubs params={params} />
                                    </TabsContent>
                                    <TabsContent value="packages">
                                        <MemberPkg params={params} />
                                    </TabsContent>
                                </Tabs>

                                <Tabs
                                    defaultValue="payments methods"
                                    className="flex-1 flex flex-col min-h-0"
                                >
                                    <TabsList className="bg-transparent rounded-none p-0 justify-start gap-1 flex-shrink-0">
                                        {[
                                            'payments methods',
                                            'invoices',
                                            'transactions',
                                            'rewards',
                                            'achievements',
                                        ].map((tab) => (
                                            <TabsTrigger
                                                key={tab}
                                                value={tab}
                                                className="bg-foreground/5 text-xs capitalize rounded-full"
                                            >
                                                {tab}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <TabsContent value="payments methods">
                                        <PaymentMethods
                                            editable={canEditMember}
                                            params={params}
                                        />
                                    </TabsContent>
                                    <TabsContent value="invoices">
                                        <MemberInvoice params={params} />
                                    </TabsContent>
                                    <TabsContent value="transactions">
                                        <MemberTransactions params={params} />
                                    </TabsContent>
                                    <TabsContent value="rewards">
                                        <MemberRewards params={params} />
                                    </TabsContent>
                                    <TabsContent value="achievements">
                                        <MemberAchievements params={params} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </MemberProvider>
        </TooltipProvider>
    )
}
