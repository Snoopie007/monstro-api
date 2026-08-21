import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
    type ChargeWithGatewayResult,
} from "@/utils";
import { courseEnrollments, transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { CourseEnrollError } from "./errors";
import { generateUUID } from "subtrees/utils";

type CourseEnrollParams = {
    lid: string;
    mid: string;
    courseId: string;
    paymentMethodId: string;
    courseTitle: string;
    coursePrice: number;
    paymentType: PaymentType;
};

export async function handleCourseEnrollPaid(params: CourseEnrollParams) {
    const {
        lid,
        mid,
        courseId,
        paymentMethodId,
        courseTitle,
        coursePrice,
        paymentType,
    } = params;
    const transactionId = generateUUID('txn_');
    const enrollmentId = generateUUID('cen_');


    const duplicate = await db.query.courseEnrollments.findFirst({
        where: (enrollment, { and, eq }) => and(
            eq(enrollment.courseId, courseId),
            eq(enrollment.memberId, mid),
        ),
    });
    if (duplicate) throw new CourseEnrollError(409, "Member is already enrolled in this course", "DUPLICATE_ENROLLMENT");

    const { gatewayCustomerId, locationState, taxRates, gateway } = await getCheckoutContext({ lid, mid });
    const taxRate = taxRates.find((r) => r.isDefault)?.percentage || 0;
    const { total, feesAmount, tax, subTotal } = calculateChargeDetails({
        amount: coursePrice,
        taxRate,
        passOnFees: locationState.settings?.passOnFees || false,
        usagePercent: locationState.usagePercent || 0,
        paymentType,
        isRecurring: false,
    });
    const currency = locationState.currency;
    const description = `Payment for course enrollment ${courseTitle}`;
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
        } : {}),
        checkoutKind: "course",
        courseId,
    };

    const charge: ChargeWithGatewayResult = await chargeWithGateway({
        gateway,
        gatewayCustomerId,
        paymentMethodId,
        transactionId,
        paymentType,
        total,
        feesAmount,
        currency,
        description,
        note: `enrollmentId:${enrollmentId}|mid:${mid}|locationId:${lid}|courseId:${courseId}`,
        metadata: { memberId: mid, locationId: lid, transactionId },
    });

    switch (charge.status) {
        case "approved": {
            const now = new Date();
            const result = await db.transaction(async (tx) => {
                const [created] = await tx.insert(transactions).values({
                    id: transactionId,
                    description,
                    total,
                    subTotal,
                    tax,
                    type: "inbound",
                    status: "paid",
                    locationId: lid,
                    memberId: mid,
                    paymentMethodId,
                    paymentType,
                    feeAmount: feesAmount,
                    currency,
                    chargeDate: now,
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    activities: [{
                        at: now.toISOString(),
                        reason: "Payment succeeded",
                        paymentType: charge.paymentType ?? paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }],
                }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
                if (!created) {
                    const current = await tx.query.courseEnrollments.findFirst({
                        where: (enrollment, { eq }) => eq(enrollment.transactionId, transactionId),
                    });
                    if (current) return current;
                    throw new CourseEnrollError(202, "Payment is being finalized; do not retry", "FULFILLMENT_PENDING");
                }
                const [enrollment] = await tx.insert(courseEnrollments).values({
                    id: enrollmentId,
                    memberId: mid,
                    locationId: lid,
                    courseId,
                    transactionId,
                    enrolledAt: new Date(),
                }).onConflictDoNothing().returning();
                if (!enrollment) {
                    const current = await tx.query.courseEnrollments.findFirst({
                        where: (candidate, { and, eq }) => and(eq(candidate.courseId, courseId), eq(candidate.memberId, mid)),
                    });
                    if (!current) throw new CourseEnrollError(500, "Unable to create enrollment");
                    return current;
                }
                return enrollment;
            });
            return result;
        }
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                description,
                total,
                subTotal,
                tax,
                type: "inbound",
                status: "failed",
                locationId: lid,
                memberId: mid,
                paymentMethodId,
                paymentType,
                feeAmount: feesAmount,
                currency,
                chargeDate: now,
                paymentIntentId: charge.paymentIntentId,
                failedReason: charge.failureReason,
                failedCode: charge.failureCode,
                metadata: { ...metadata, ...charge.gatewayMetadata },
                activities: [{
                    at: now.toISOString(),
                    reason: `Payment failed: ${charge.failureReason}`,
                    paymentType: charge.paymentType ?? paymentType,
                    brand: charge.brand,
                    last4: charge.last4,
                }],
            }).onConflictDoNothing({ target: transactions.id });
            throw new CourseEnrollError(400, charge.failureReason, charge.failureCode);
        }
        case "uncertain":
            throw new CourseEnrollError(202, "Payment status is unknown; do not retry", "PAYMENT_UNCERTAIN");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
