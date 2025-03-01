
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"

import {
    MemberAchievements,
    MemberSubs,
    MemberTransactions,
    MemberRewards,
    MemberAttedance,
    MemberFamilies
} from './components'

import { cn } from '@/libs/utils'
import { PaymentMethods, MemberProfile } from './components'
import { db } from "@/db/db"
import { and, sql } from "drizzle-orm"
import { decodeId } from "@/libs/server/sqids"
import { MemberProvider } from "./providers/MemberContext"
import { Member } from "@/types"
import Stripe from "stripe"
import { MemberStripePayments } from "@/libs/server/stripe"
import { MemberPackages } from "./components/MemberPackages/MemberPackages"
import { MemberInvoices } from "./components/MemberInvoices/MemberInvoices"


type PromiseReturnType = {
    stripeKey: { apiKey: string | null, accessToken: string | null } | undefined,
    member: Member | undefined
}

async function fetchStripeKeys(id: string, mid: number): Promise<PromiseReturnType> {
    const decodedId = decodeId(id);
    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) => (and(eq(integration.locationId, decodedId), eq(integration.service, "stripe"))),
            columns: {
                accessToken: true,
                apiKey: true
            }
        })

        const member = await db.query.members.findFirst({
            where: (members, { eq }) => eq(members.id, mid),
            with: {
                familyMembers: {
                    with: {
                        relatedMember: true
                    }
                },
                subscriptions: {
                    where: (memberSubscriptions, { eq, and }) => and(
                        eq(memberSubscriptions.beneficiaryId, mid),
                        eq(memberSubscriptions.locationId, decodedId)
                    ),
                    with: {
                        plan: {
                            with: {
                                program: true,
                            }
                        }
                    }
                },
            },
            extras: {
                stripeCustomerId: sql<string>`(SELECT stripe_customer_id FROM member_locations WHERE member_locations.member_id = members.id 
                 AND member_locations.location_id = ${decodedId})`.as("stripeCustomerId"),
            }
        });


        return { stripeKey: integrations, member };

    } catch (error) {
        console.log("error", error);
        return { stripeKey: undefined, member: undefined };
    }
}

async function fetchStripePyamentMethods(accessToken: string, customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
        const stripe = new MemberStripePayments(accessToken);
        const paymentMethods = await stripe.getPaymentMethods(customerId, 25)
        return paymentMethods.data;
    } catch (error) {
        console.log("error", error);
        return [];
    }
}


const MemberDetailsMenu = [
    "Subscriptions",
    "Packages",
    "Invoices",
    "Achievements",
    "Attendance",
    "Transactions",
    "Rewards"
]

export default async function MemberProfilePage(props: { params: Promise<{ id: string, mid: number }> }) {
    const params = await props.params;

    const { stripeKey, member } = await fetchStripeKeys(params.id, params.mid)
    let paymentMethods: Stripe.PaymentMethod[] = [];

    if (!member) {
        return <div>Member not found</div>
    }

    if (stripeKey?.accessToken && member?.stripeCustomerId) {
        paymentMethods = await fetchStripePyamentMethods(stripeKey.accessToken, member.stripeCustomerId);
    }

    return (
        <div className='grid grid-cols-12 gap-6 p-4'>
            <MemberProvider member={member} paymentMethods={paymentMethods}>
                <div className='col-span-4 space-y-4'>
                    <MemberProfile params={params} />
                    <PaymentMethods stripeKey={stripeKey ? stripeKey?.apiKey : ''} params={params} />
                    <MemberFamilies params={params} familyMembers={member.familyMembers} />
                </div>
                <div className='col-span-8'>
                    <Tabs defaultValue="Subscriptions" className="w-full" >
                        <TabsList className={cn()}>
                            {MemberDetailsMenu.map((item, index) => (
                                <TabsTrigger key={index} value={item}>{item}</TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="Subscriptions">
                            <MemberSubs params={params} />
                        </TabsContent>
                        <TabsContent value="Packages">
                            <MemberPackages params={params} />
                        </TabsContent>
                        <TabsContent value="Achievements">
                            <MemberAchievements params={params} />
                        </TabsContent>
                        <TabsContent value="Attendance">
                            <MemberAttedance params={params} />
                        </TabsContent>
                        <TabsContent value="Invoices">
                            <MemberInvoices params={params} />
                        </TabsContent>
                        <TabsContent value="Transactions">
                            <MemberTransactions params={params} />
                        </TabsContent>

                        <TabsContent value="Rewards">
                            <MemberRewards params={params} />
                        </TabsContent>

                    </Tabs>
                </div>
            </MemberProvider>
        </div >
    )
}
