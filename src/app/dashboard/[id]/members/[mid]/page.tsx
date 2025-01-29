
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"

import {
    MemberAchievements,
    MemberEnrollments,
    MemberTransactions,
    MemberRewards,
    MemberAttedance,
    MemberFamilies
} from './components'

import { cn } from '@/libs/utils'

import { PaymentMethods, MemberProfile } from './components'

import { db } from "@/db/db"
import { and, sql } from "drizzle-orm"
import { decodeId, getStripe } from "@/libs/server-utils"
import { MemberProvider } from "./providers/MemberContext"
import { Member } from "@/types"
import Stripe from "stripe"

type PromiseReturnType = {
    stripeKey: { apiKey: string | null, accessToken: string | null } | null,
    member: Member | null
}

async function fetchStripeKeys(id: string, mid: number): Promise<PromiseReturnType> {
    const decodedId = decodeId(id);
    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) => (and(eq(integration.locationId, decodedId), eq(integration.service, "Stripe"))),
            columns: {
                accessToken: true,
                apiKey: true
            }
        })
        const member = await db.query.members.findFirst({
            where: (members, { eq }) => eq(members.id, mid),
            extras: {
                stripeCustomerId: sql<string>`(SELECT stripe_customer_id FROM member_locations WHERE member_locations.member_id = members.id 
                 AND member_locations.location_id = ${decodedId})`.as("stripeCustomerId"),
            }
        });


        return { stripeKey: integrations ? integrations : null, member: member ? member : null };

    } catch (error) {
        console.log("error", error);
        return { stripeKey: null, member: null };
    }
}

async function fetchStripePyamentMethods(accessToken: string, customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
        const stripe = getStripe(accessToken);
        const paymentMethods = await stripe.customers.listPaymentMethods(
            customerId,
            {
                limit: 25
            }
        );

        return paymentMethods.data;
    } catch (error) {
        return [];
    }
}


const MemberDetailsMenu = [
    "Achievements",
    "Attendance",
    "Enrollments",
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
                    <MemberFamilies params={params} />
                </div>
                <div className='col-span-8'>
                    <Tabs defaultValue="Achievements" className="w-full" >
                        <TabsList className={cn(`grid w-full grid-cols-${MemberDetailsMenu.length}`)}>
                            {MemberDetailsMenu.map((item, index) => (
                                <TabsTrigger key={index} value={item}>{item}</TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="Achievements">
                            <MemberAchievements params={params} />
                        </TabsContent>
                        <TabsContent value="Attendance">
                            <MemberAttedance params={params} />
                        </TabsContent>
                        <TabsContent value="Enrollments">
                            <MemberEnrollments params={params} />
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
