import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    TooltipProvider,
} from '@/components/ui'

import {
    MemberAchievements,
    MemberSubs,
    MemberTransactions,
    MemberRewards,
    MemberAttedance,
    MemberFamilies,
} from './components'

import { cn } from '@/libs/utils'
import { PaymentMethods, MemberProfile, MemberEditButton } from './components'
import { db } from '@/db/db'
import { and, eq, or, desc } from 'drizzle-orm'
import { MemberProvider } from './providers/MemberContext'
import { Member, MemberLocation } from '@/types'
import Stripe from 'stripe'
import { MemberStripePayments } from '@/libs/server/stripe'
import { MemberPackages } from './components/MemberPackages/MemberPackages'
import { MemberInvoices } from './components/MemberInvoices/MemberInvoices'
import { CustomFieldsSection } from '@/components/custom-fields'
import { MemberTagSection } from './components/MemberTags/MemberTagsSection'
import { attendances, reservations, recurringReservations } from '@/db/schemas'
import { format } from 'date-fns'
import { usePermission } from '@/hooks/usePermissions'
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

async function fetchStripePyamentMethods(
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

const MemberDetailsMenu = [
    'Subscriptions',
    'Packages',
    'Invoices',
    'Transactions',
    'Achievements',
    'Rewards',
    'Attendance',
]

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
        paymentMethods = await fetchStripePyamentMethods(
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
                    {/* Main content */}
                    <div className="grid grid-cols-12 flex-1">
                        <div className="col-span-4 border-r border-foreground/10">
                            <MemberProfile
                                params={params}
                                profileData={memberProfileData}
                            />
                            <MemberFamilies
                                params={params}
                                familyMembers={member.familyMembers}
                                editable={canEditMember}
                            />
                            <PaymentMethods
                                editable={canEditMember}
                                params={params}
                            />
                            {/* Custom Fields Section */}
                            <CustomFieldsSection
                                memberId={params.mid}
                                locationId={params.id}
                                editable={canEditMember}
                                variant="card"
                                showEmptyFields={true}
                            />
                            <MemberTagSection
                                editable={canEditMember}
                                params={params}
                            />
                        </div>
                        <div className="col-span-8">
                            <Tabs
                                defaultValue="Subscriptions"
                                className="w-full"
                            >
                                <TabsList
                                    className={cn(
                                        'bg-transparent p-2.5 border-b w-full border-foreground/10 justify-start'
                                    )}
                                >
                                    {MemberDetailsMenu.map((item, index) => (
                                        <TabsTrigger
                                            key={index}
                                            value={item}
                                            className="text-xs "
                                        >
                                            {item}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                <TabsContent
                                    value="Subscriptions"
                                    className="mt-0"
                                >
                                    <MemberSubs params={params} />
                                </TabsContent>
                                <TabsContent value="Packages" className="mt-0">
                                    <MemberPackages params={params} />
                                </TabsContent>
                                <TabsContent
                                    value="Achievements"
                                    className="mt-0"
                                >
                                    <MemberAchievements params={params} />
                                </TabsContent>
                                <TabsContent
                                    value="Attendance"
                                    className="mt-0"
                                >
                                    <MemberAttedance params={params} />
                                </TabsContent>
                                <TabsContent value="Invoices" className="mt-0">
                                    <MemberInvoices params={params} />
                                </TabsContent>
                                <TabsContent
                                    value="Transactions"
                                    className="mt-0"
                                >
                                    <MemberTransactions params={params} />
                                </TabsContent>

                                <TabsContent value="Rewards" className="mt-0">
                                    <MemberRewards params={params} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </MemberProvider>
            </TooltipProvider>
        </div>
    )
}
