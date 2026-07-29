import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { memberPackages, memberInvoices, transactions } from "@subtrees/schemas";
import {
    calculateChargeDetails,
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs,
    triggerPurchase,
    fetchPromoDiscount,
    calculateThresholdDate,
    getCheckoutContext,
    type ChargeWithGatewayResult,
} from "@/utils";
import { broadcastAchievement } from "@/libs/broadcast/achievements";

export type EnrollPkgInput = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
};

export async function handleEnrollPackage(props: EnrollPkgInput) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId } = props;

    const [checkout, pricing] = await Promise.all([
        getCheckoutContext({ lid, mid }),
        db.query.memberPlanPricing.findFirst({
            where: (row, { eq }) => eq(row.id, priceId),
            with: { plan: true },
        }),
    ]);

    if (!pricing?.plan) {
        throw new CheckoutError(404, "Pricing not found");
    }

    const { ml, gateway, taxRates, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const { settings, usagePercent, currency } = locationState;
    const discount = await fetchPromoDiscount(promoId ?? undefined, pricing);
    const taxRate = taxRates.find((r) => r.isDefault) || taxRates[0];

    const productName = `${pricing.plan.name}/${pricing.name}`;
    const description = `Payment for ${productName}`;

    const chargeDetails = calculateChargeDetails({
        amount: pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        usagePercent: usagePercent || 0,
        paymentType,
        isRecurring: false,
        passOnFees: settings?.passOnFees || false,
    });

    const today = new Date();

    let endDate: Date | undefined;
    if (pricing.expireThreshold && pricing.expireInterval) {
        endDate = calculateThresholdDate({
            startDate: today,
            threshold: pricing.expireThreshold,
            interval: pricing.expireInterval,
        });
    }


    let chargeResult: ChargeWithGatewayResult | undefined;
    try {
        const note = `mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`;
        chargeResult = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            paymentType,
            total: chargeDetails.total,
            feesAmount: chargeDetails.feesAmount,
            currency,
            description,
            note,
            metadata: {
                locationId: lid,
                memberId: mid,
            },
        });
    } catch (error) {
        console.error(error);
        throw error;
    }

    if (!chargeResult) {
        throw new Error("Failed to charge");
    }

    let unsignedDocs: string[] = [];


    await db.transaction(async (tx) => {


        const [p] = await tx.insert(memberPackages).values({
            locationId: lid,
            memberId: mid,
            totalClassLimit: pricing.plan?.totalClassLimit ?? 0,
            memberPlanPricingId: pricing.id,
            paymentType,
            startDate: today,
            expireDate: endDate,
            status: "active",
        }).returning({ id: memberPackages.id });

        if (!p) {
            throw new Error("Failed to create package");
        }

        const [transaction] = await tx.insert(transactions).values({
            memberId: mid,
            locationId: lid,
            ...chargeDetails,
            description,
            type: "inbound",
            status: "paid",
            chargeDate: today,
            paymentMethodId,
            paymentIntentId: chargeResult.paymentIntentId,
            activities: [{
                at: today.toISOString(),
                reason: "Payment succeeded",
                paymentType,
                brand: chargeResult.brand,
                last4: chargeResult.last4,
            }],
            paymentType,
            metadata: {
                memberPlanPricingId: pricing.id,
            },
        }).returning({ id: transactions.id });

        if (!transaction) {
            tx.rollback();
            throw new Error("Failed to create transaction");
        }

        const [invoice] = await tx.insert(memberInvoices).values({
            ...chargeDetails,
            description,
            items: [{
                name: productName,
                quantity: 1,
                price: chargeDetails.unitCost,
                discount,
            }],

            memberId: mid,
            locationId: lid,
            memberPlanId: p.id,
            paymentType,
            currency,
            dueDate: today,
            transactionId: transaction.id,
        }).returning({ id: memberInvoices.id });

        if (!invoice) {
            tx.rollback();
            throw new Error("Failed to create invoice");
        }
        unsignedDocs = await createEnrollUnsignedDocs(tx, {
            mid,
            lid,
            memberPlanId: p.id,
            contractId: pricing.plan.contractId,
            waiverId: locationState.waiverId,
            signedWaiverId: ml.signedWaiverId,
        });
    });

    triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((a) => {
        if (a) {
            broadcastAchievement(ml.member.userId, a);
        }
    }).catch((err) => {
        console.error("Error triggering purchase:", err);
    });

    return { ok: true, unsignedDocs };
}
