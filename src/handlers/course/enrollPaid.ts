import { db } from "@/db/db";
import {
    authorizeReferenceIdForTransaction,
    calculateChargeDetails,
    chargeWithGateway,
    getAdditionalFeesForCheckout,
    getCheckoutContext,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import { courseEnrollments, transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { CourseEnrollError } from "./errors";

type CourseEnrollParams = {
    lid: string;
    mid: string;
    courseId: string;
    paymentMethodId: string;
    courseTitle: string;
    coursePrice: number;
    paymentType: PaymentType;
    attemptId: string;
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
        attemptId,
    } = params;
    const transactionId = stableCheckoutTransactionId("course", lid, mid, attemptId);
    const authorizeReferenceId = authorizeReferenceIdForTransaction(transactionId);

    const existing = await db.query.transactions.findFirst({
        where: (tx, { and, eq }) => and(eq(tx.id, transactionId), eq(tx.locationId, lid), eq(tx.memberId, mid)),
    });
    if (existing) {
        if (existing.status === "pending") {
            throw new CourseEnrollError(202, "Payment is pending; do not retry", "PAYMENT_PENDING");
        }
        if (existing.status === "failed") {
            throw new CourseEnrollError(400, existing.failedReason || "Payment was declined", existing.failedCode || "PAYMENT_FAILED");
        }
        if (existing.status !== "paid") {
            throw new CourseEnrollError(500, "Unexpected transaction status");
        }
        const enrollment = await db.query.courseEnrollments.findFirst({
            where: (enrollment, { eq }) => eq(enrollment.transactionId, existing.id),
        });
        if (!enrollment) throw new CourseEnrollError(202, "Payment is paid and enrollment is being finalized", "FULFILLMENT_PENDING");
        return enrollment;
    }
    const duplicate = await db.query.courseEnrollments.findFirst({
        where: (enrollment, { and, eq }) => and(
            eq(enrollment.courseId, courseId),
            eq(enrollment.memberId, mid),
        ),
    });
    if (duplicate) throw new CourseEnrollError(409, "Member is already enrolled in this course", "DUPLICATE_ENROLLMENT");

    const { gatewayCustomerId, locationState, taxRates, gateway } = await getCheckoutContext({ lid, mid });
    const taxRate = taxRates.find((r) => r.isDefault)?.percentage || 0;
    const additionalFees = await getAdditionalFeesForCheckout(lid, "course");
    const chargeDetails = calculateChargeDetails({
        amount: coursePrice,
        taxRate,
        usagePercent: locationState.usagePercent || 0,
        additionalFees,
    });
    const { total, feesAmount, tax, subTotal } = chargeDetails;
    const currency = locationState.currency;
    const description = `Payment for course enrollment ${courseTitle}`;
    const items = [{
        kind: "item" as const,
        name: courseTitle,
        quantity: 1,
        price: chargeDetails.unitCost,
        productId: courseId,
    }, ...chargeDetails.additionalFeeLines];
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
            authorizeReferenceId,
        } : {}),
        gatewayService: gateway.service,
        checkoutKind: "course",
        checkoutAttemptId: attemptId,
        courseId,
    };
    const charge: ChargeWithGatewayResult = await chargeWithGateway({
        gateway,
        gatewayCustomerId,
        paymentMethodId,
        transactionId,
        authorizeReferenceId,
        paymentType,
        total,
        feesAmount,
        currency,
        description,
        referenceId: transactionId,
        note: `enrollmentId:${transactionId}|mid:${mid}|locationId:${lid}|courseId:${courseId}`,
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
                    items,
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
                items,
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
