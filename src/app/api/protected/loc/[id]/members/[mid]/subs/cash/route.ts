import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import {
    calculatePeriodEnd,
} from "../../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { triggerSignUp } from "@/libs/achievements";


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

        if (!member || !member.stripeCustomerId) {
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
            status: "incomplete",
            metadata: {
                paymentMethodId: paymentMethod.id,
                memberId: mid,
                locationId: id
            }
        }).returning()



        // if (data.paymentType === "cash") {
        //     // Invoice starts as DRAFT
        //     const [{ invoiceId }] = await tx.insert(memberInvoices).values({

        //         status: "paid",
        //         paymentType: "cash",
        //         invoiceType: "recurring",
        //         memberSubscriptionId: sub.id
        //     }).returning({ invoiceId: memberInvoices.id });

        //     // Transaction created as incomplete
        //     await tx.insert(transactions).values({

        //         invoiceId,
        //         status: "paid",
        //         paymentType: "cash",
        //     });
        // }


        // // Schedule recurring invoice email reminders (only for manual/cash, plan_id >= 2, no Stripe)
        // try {
        //     // Check if location has plan_id >= 2
        //     if (locationState?.planId && locationState.planId >= 2) {
        //         // Check if location has NO Stripe integration
        //         const hasStripe = await db.query.integrations.findFirst({
        //             where: and(
        //                 eq(integrations.locationId, params.id),
        //                 eq(integrations.service, 'stripe')
        //             )
        //         });

        //         if (!hasStripe) {
        //             // Fetch member and location details
        //             const member = await db.query.members.findFirst({
        //                 where: eq(members.id, params.mid)
        //             });

        //             const location = await db.query.locations.findFirst({
        //                 where: eq(locations.id, params.id)
        //             });

        //             if (member && location && plan.interval && plan.intervalThreshold) {
        //                 await scheduleRecurringInvoiceEmails({
        //                     subscriptionId: sub.id,
        //                     memberId: params.mid,
        //                     locationId: params.id,
        //                     memberEmail: member.email || '',
        //                     memberFirstName: member.firstName || '',
        //                     memberLastName: member.lastName || '',
        //                     locationName: location.name,
        //                     locationAddress: location.address || '',
        //                     startDate: sub.currentPeriodEnd, // First invoice due at end of first period
        //                     interval: plan.interval,
        //                     intervalThreshold: plan.intervalThreshold,
        //                     invoiceDetails: {
        //                         description: newInvoice.description || `${plan.name} - Recurring Invoice`,
        //                         items: newInvoice.items as any[],
        //                         total: newInvoice.total,
        //                         currency: 'usd'
        //                     }
        //                 });
        //                 console.log(`📧 Scheduled recurring invoice emails for subscription ${sub.id}`);
        //             }
        //         }
        //     }
        // } catch (error) {
        //     console.error('Error scheduling recurring invoice emails:', error);
        //     // Don't fail the request if email scheduling fails
        // }

        await triggerSignUp({
            mid: mid,
            lid: id,
            pid: plan.id,
        });



        return NextResponse.json({ ...sub, plan: plan, }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

