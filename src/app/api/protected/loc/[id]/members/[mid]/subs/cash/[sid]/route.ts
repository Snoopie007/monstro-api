import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cancelRecurringInvoiceReminders } from "../../../../utils";

type Params = {
    id: string;
    mid: string;
    sid: string;
}

export async function PATCH(req: Request, props: { params: Promise<Params> }) {
    const { id, sid } = await props.params;
    const { cancelOption, customDate, reason } = await req.json();

    // Input validation
    if (!['now', 'end', 'custom'].includes(cancelOption)) {
        throw new Error("Invalid cancellation option");
    }

    if (cancelOption === 'custom' && !customDate) {
        throw new Error("Custom date required");
    }

    try {
        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (ms, { eq }) => eq(ms.id, sid),
            with: {
                plan: true,
                member: true
            }
        });

        if (!subscription) {
            throw new Error("Subscription not found");
        }

        if (subscription.status === 'canceled') {
            throw new Error("Already canceled");
        }

        // Verify this is a cash subscription
        if (subscription.paymentType !== 'cash') {
            throw new Error("This route is only for cash subscriptions");
        }

        const cancelDate = cancelOption === 'end' 
            ? subscription.currentPeriodEnd 
            : customDate ? new Date(customDate) : new Date();

        // Update subscription status
        await db
            .update(memberSubscriptions)
            .set({
                status: 'canceled',
                cancelAt: cancelDate,
                cancelAtPeriodEnd: cancelOption === 'end',
                endedAt: cancelOption === 'now' ? cancelDate : (cancelOption === 'end' ? null : cancelDate),
                metadata: {
                    ...(subscription.metadata || {}),
                    cancellation: {
                        reason,
                        option: cancelOption,
                        processedAt: new Date().toISOString()
                    }
                },
                updated: new Date()
            })
            .where(eq(memberSubscriptions.id, sid));
            await cancelRecurringInvoiceReminders({ subscriptionId: sid, locationId: id });
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.error("Cash subscription cancellation error:", err);
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "Cancellation failed",
                ...(process.env.NODE_ENV === 'development' ? {
                    stack: err instanceof Error ? err.stack : undefined
                } : {})
            },
            { status: 500 }
        );
    }
}