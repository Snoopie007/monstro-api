import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
    type ChargeWithGatewayResult,
} from "@/utils";
import { courseEnrollments, transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { generateUUID } from "@subtrees/utils/generateUUID";

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
    const { lid, mid, courseId, paymentMethodId, courseTitle, coursePrice, paymentType } = params;

    const {
        gatewayCustomerId,
        ml,
        taxRates,
        gateway,
    } = await getCheckoutContext({ lid, mid });

    const locationState = ml.location.locationState;
    const taxRate = taxRates.find((r) => r.isDefault)?.percentage || 0;
    const passOnFees = locationState.settings?.passOnFees || false;
    const usagePercent = locationState.usagePercent || 0;

    const { total, feesAmount, tax, subTotal } = calculateChargeDetails({
        amount: coursePrice,
        taxRate,
        passOnFees,
        usagePercent,
        paymentType,
        isRecurring: false,
    });
    const currency = locationState.currency;
    const now = new Date();

    const enrollmentId = generateUUID("cen_");
    const description = `Payment for course enrollment ${courseTitle}`;
    let chargeResult: ChargeWithGatewayResult | undefined;
    try {
        const note = `mid:${mid}|lid:${lid}|courseId:${courseId}`;

        chargeResult = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            paymentType,
            total,
            feesAmount,
            currency,
            description,
            referenceId: enrollmentId,
            note,
            metadata: {
                memberId: mid,
                locationId: lid,
                enrollmentId,
            },
        });

    } catch (error) {
        console.error(error);
        throw error;
    }
    return db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
            description,
            total,
            subTotal,
            tax,
            type: "inbound",
            status: "paid",
            paymentIntentId: chargeResult?.paymentIntentId,
            locationId: lid,
            memberId: mid,
            paymentMethodId,
            paymentType: "card",
            chargeDate: now,
            feeAmount: feesAmount,
            currency,
            activities: [{
                at: now.toISOString(),
                reason: "Payment succeeded",
                paymentType,
                brand: chargeResult.brand,
                last4: chargeResult.last4,
            }],
            metadata: {
                enrollmentId,
            },
        }).returning();

        const [enrollment] = await tx.insert(courseEnrollments).values({
            id: enrollmentId,
            transactionId: transaction?.id,
            memberId: mid,
            locationId: lid,
            courseId,
            enrolledAt: now,
        }).returning();

        return enrollment;
    });
}
