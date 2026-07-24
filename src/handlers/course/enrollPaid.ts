import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
    PaymentChargeError,
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
        ...(gateway.service === "authorize" ? { authorizeIntegrationId: gateway.integrationId } : {}),
        gatewayService: gateway.service,
        checkoutKind: "course",
        checkoutAttemptId: attemptId,
        courseId,
    };

    const [created] = await db.insert(transactions).values({
        id: transactionId,
        description,
        total,
        subTotal,
        tax,
        type: "inbound",
        status: "pending",
        locationId: lid,
        memberId: mid,
        paymentMethodId,
        paymentType,
        feeAmount: feesAmount,
        currency,
        metadata,
    }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
    if (!created) {
        const raced = await db.query.transactions.findFirst({ where: (tx, { eq }) => eq(tx.id, transactionId) });
        if (!raced) throw new CourseEnrollError(500, "Unable to create transaction");
        if (raced.status === "paid") {
            const enrollment = await db.query.courseEnrollments.findFirst({
                where: (enrollment, { eq }) => eq(enrollment.transactionId, raced.id),
            });
            if (enrollment) return enrollment;
        }
        throw new CourseEnrollError(202, "Payment is pending; do not retry", "PAYMENT_PENDING");
    }

    let charge: ChargeWithGatewayResult;
    try {
        charge = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            transactionId,
            paymentType,
            total,
            feesAmount,
            currency,
            description,
            referenceId: transactionId,
            note: `enrollmentId:${transactionId}|mid:${mid}|locationId:${lid}|courseId:${courseId}`,
            metadata: { memberId: mid, locationId: lid, transactionId },
        });
    } catch (error) {
        await db.update(transactions).set({
            status: "failed",
            failedReason: error instanceof Error ? error.message : "Payment failed",
            failedCode: error instanceof PaymentChargeError ? error.code || "PAYMENT_FAILED" : "PAYMENT_FAILED",
            updated: new Date(),
        }).where(eq(transactions.id, transactionId));
        throw error;
    }

    switch (charge.status) {
        case "approved": {
            const result = await db.transaction(async (tx) => {
                const [updated] = await tx.update(transactions).set({
                    status: "paid",
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    updated: new Date(),
                }).where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending"))).returning();
                if (!updated) {
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
        case "failed":
            await db.update(transactions).set({
                status: "failed",
                paymentIntentId: charge.paymentIntentId,
                failedReason: charge.failureReason,
                failedCode: charge.failureCode,
                metadata: { ...metadata, ...charge.gatewayMetadata },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new CourseEnrollError(400, charge.failureReason, charge.failureCode);
        case "held":
            await db.update(transactions).set({
                status: "pending",
                paymentIntentId: charge.paymentIntentId,
                metadata: { ...metadata, ...charge.gatewayMetadata, authorizeHeld: true },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new CourseEnrollError(202, "Payment is pending; do not retry", "PAYMENT_PENDING");
        case "uncertain":
            await db.update(transactions).set({
                status: "pending",
                metadata: { ...metadata, ...charge.gatewayMetadata, paymentUncertain: true },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new CourseEnrollError(202, "Payment status is unknown; do not retry", "PAYMENT_UNCERTAIN");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
