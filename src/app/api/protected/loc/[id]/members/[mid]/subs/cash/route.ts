import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import {
    calculatePeriodEnd,
    scheduleRecurringInvoiceEmails,
} from "../../../utils";
import { NextResponse } from "next/server";


type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
}

export async function POST(req: Request, props: Props) {
    const { id, mid } = await props.params;
    const { paymentMethod, paymentType, trialDays, ...data } = await req.json();
    try {
        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            throw new Error("Plan not found")
        }


        const ml = await db.query.memberLocations.findFirst({
            where: (memberLocation, { eq, and }) => and(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, id)
            ),
            with: {
                member: true,
                location: {
                    with: {
                        locationState: true
                    }
                }
            }
        });

        if (!ml) {
            throw new Error("No member location found")
        }

        const { location, member } = ml;

        if (!member) {
            throw new Error("Member not found");
        }



        const today = new Date()
        const startDate = data.startDate ? new Date(data.startDate) : today;
        const endDate = calculatePeriodEnd(
            startDate,
            plan.interval!,
            plan.intervalThreshold!
        );

        const [sub] = await db.insert(memberSubscriptions).values({
            startDate: startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            locationId: id,
            memberId: mid,
            memberPlanId: plan.id,
            paymentType,
            status: "active",
            metadata: {
                memberId: mid,
                locationId: id
            }
        }).returning()

        // const tx = await db.transaction(async (tx) => {
        // TODO: uncomment and refine when invoices are being done
        // // Invoice starts as DRAFT
        // const [{ invoiceId }] = await tx.insert(memberInvoices).values({
        //     locationId: id,
        //     memberId: mid,
        //     description: `Recurring Invoice for ${plan.name}`,
        //     status: "paid",
        //     paymentType: "cash",
        //     invoiceType: "recurring",
        //     memberSubscriptionId: sub.id
        // }).returning({ invoiceId: memberInvoices.id });

        // // Transaction created as incomplete
        // await tx.insert(transactions).values({
        //     locationId: id,
        //     memberId: mid,
        //     type: "inbound",
        //     invoiceId,
        //     status: "paid",
        //     paymentType: "cash",
        // });
        // })


        const { locationState } = location;

        // if (locationState?.planId && locationState.planId >= 2) {


        //     if (member && location && plan.interval && plan.intervalThreshold) {
        //         await scheduleRecurringInvoiceEmails({
        //             subscriptionId: sub.id,
        //             memberId: params.mid,
        //             locationId: params.id,
        //             memberEmail: member.email || '',
        //             memberFirstName: member.firstName || '',
        //             memberLastName: member.lastName || '',
        //             locationName: location.name,
        //             locationAddress: location.address || '',
        //             startDate: sub.currentPeriodEnd, // First invoice due at end of first period
        //             interval: plan.interval,
        //             intervalThreshold: plan.intervalThreshold,
        //             invoiceDetails: {
        //                 description: newInvoice.description || `${plan.name} - Recurring Invoice`,
        //                 items: newInvoice.items as any[],
        //                 total: newInvoice.total,
        //                 currency: 'usd'
        //             }
        //         });
        //         console.log(`📧 Scheduled recurring invoice emails for subscription ${sub.id}`);
        //     }
        // }

        // await triggerSignUp({
        //     mid: mid,
        //     lid: id,
        //     pid: plan.id,
        // });



        return NextResponse.json({ ...sub, plan: plan, }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

