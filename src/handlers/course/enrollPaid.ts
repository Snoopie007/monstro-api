import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
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
        locationState,
        taxRates,
        gateway,
    } = await getCheckoutContext({ lid, mid });

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

    return db.transaction(async (tx) => {
        const enrollmentId = generateUUID("cen_");
        const description = `Payment for course enrollment ${courseTitle}`;

        let paymentIntentId: string | null = null;
        let gatewayMetadata: Record<string, unknown> = {
            gatewayService: gateway.service,
            enrollmentId,
            courseId,
        };

        try {
            const charge = await chargeWithGateway({
                gateway,
                gatewayCustomerId,
                paymentMethodId,
                paymentType,
                total,
                feesAmount,
                currency,
                description,
                referenceId: enrollmentId,
                note: `enrollmentId:${enrollmentId}|mid:${mid}|locationId:${lid}|courseId:${courseId}`,
                metadata: {
                    memberId: mid,
                    locationId: lid,
                    enrollmentId,
                },
            });
            paymentIntentId = charge.paymentIntentId;
            gatewayMetadata = {
                ...gatewayMetadata,
                ...charge.gatewayMetadata,
            };
        } catch (error) {
            console.error(error);
            tx.rollback();
            throw error;
        }

        const [transaction] = await tx.insert(transactions).values({
            description,
            total,
            subTotal,
            tax,
            type: "inbound",
            status: "paid",
            paymentIntentId,
            locationId: lid,
            memberId: mid,
            paymentMethodId,
            paymentType: "card",
            chargeDate: now,
            feeAmount: feesAmount,
            currency,
            metadata: gatewayMetadata,
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
