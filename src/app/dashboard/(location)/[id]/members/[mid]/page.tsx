
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
import { Member, MemberLocation } from "@/types"
import Stripe from "stripe"
import { MemberStripePayments } from "@/libs/server/stripe"
import { MemberPackages } from "./components/MemberPackages/MemberPackages"
import { MemberInvoices } from "./components/MemberInvoices/MemberInvoices"


type PromiseReturnType = {
    stripeIntegration: { apiKey: string | null, accessToken: string | null } | undefined,
    member: Member | undefined,
    ml: MemberLocation | undefined
}

async function fetchStripeKeys(id: string, mid: number): Promise<PromiseReturnType | null> {
    if (!id || !mid) {
        return null;
    }
    const decodedId = decodeId(id);

    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) => (and(eq(integration.locationId, decodedId), eq(integration.service, "stripe"))),
            columns: {
                accessToken: true,
                apiKey: true
            }
        })

        const ml = await db.query.memberLocations.findFirst({
            where: (ml, { eq }) => and(eq(ml.memberId, mid), eq(ml.locationId, decodedId)),
            with: {
                member: {
                    with: {
                        familyMembers: {
                            with: {
                                relatedMember: true
                            }
                        },
                        subscriptions: {
                            where: (ms, { eq, and }) => and(
                                eq(ms.memberId, mid),
                                eq(ms.locationId, decodedId)
                            ),
                            with: {
                                plan: {
                                    with: {
                                        program: true,
                                    }
                                }
                            }
                        },
                    }
                }
            }
        })
        if (!ml) {
            throw new Error("Member  not found")
        }
        const { member, ...rest } = ml

        return { stripeIntegration: integrations, member, ml: rest };

    } catch (error) {
        console.log("error", error);
        return null;
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
    "Transactions",
    "Achievements",
    "Rewards",
    "Attendance"
]

export default async function MemberProfilePage(props: { params: Promise<{ id: string, mid: number }> }) {
    const params = await props.params;

    const res = await fetchStripeKeys(params.id, params.mid)


    let paymentMethods: Stripe.PaymentMethod[] = [];

    if (!res || !res.member || !res.ml) {
        return <div>Member not found</div>
    }
    const { stripeIntegration, member, ml } = res
    if (stripeIntegration?.accessToken && ml?.stripeCustomerId) {
        paymentMethods = await fetchStripePyamentMethods(stripeIntegration.accessToken, ml.stripeCustomerId);
    }

    return (
        <div className='grid grid-cols-12 gap-6 p-4'>
            <MemberProvider member={member} paymentMethods={paymentMethods} ml={ml}>
                <div className='col-span-4 space-y-4'>
                    <MemberProfile params={params} />
                    <PaymentMethods stripeKey={stripeIntegration ? stripeIntegration?.apiKey : ''} params={params} />
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
