import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { memberPackages, memberInvoices, memberContracts } from "@subtrees/schemas";
import { StripePaymentGateway, SquarePaymentGateway } from "@/libs/PaymentGateway";
import {
    calculateChargeDetails,
    triggerPurchase,
    fetchPromoDiscount,
    calculateThresholdDate,
    fetchEnrollContext,
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

export async function handleEnrollPackage(input: EnrollPkgInput) {
    const {
        lid,
        mid,
        priceId,
        paymentMethodId,
        paymentType,
        promoId,
    } = input;

    const {
        pricing,
        ml,
        gateway,
        taxRates,
        locationState,
        gatewayCustomerId,
    } = await fetchEnrollContext({ lid, mid, priceId });

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
            status: "incomplete",
        }).returning({ id: memberPackages.id });

        if (!p) {
            tx.rollback();
            throw new Error("Failed to create package");
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
            dueDate: new Date(),
        }).returning({ id: memberInvoices.id });

        if (!invoice) {
            tx.rollback();
            throw new Error("Failed to create invoice");
        }

        if (gateway.service === "stripe") {
            try {
                const stripe = new StripePaymentGateway(gateway.accessToken);
                await stripe.createCharge(gatewayCustomerId, paymentMethodId, {
                    ...chargeDetails,
                    currency,
                    description,
                    productName,
                    metadata: {
                        memberPlanId: p.id,
                        invoiceId: invoice.id,
                        locationId: lid,
                        memberId: mid,
                    },
                });
            } catch (error) {
                console.error(error);
                throw error;
            }
        }

        if (gateway.service === "square") {
            try {
                const square = new SquarePaymentGateway(gateway.accessToken);
                const squareLocationId = gateway.metadata?.squareLocationId;
                if (!squareLocationId) {
                    throw new Error("Square location ID not found");
                }
                await square.createCharge(gatewayCustomerId, paymentMethodId, {
                    total: chargeDetails.total,
                    feesAmount: chargeDetails.feesAmount,
                    currency,
                    note: `${productName}|${description}|invId:${invoice.id}|mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`,
                    referenceId: `${invoice.id}`,
                    squareLocationId,
                });
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
        if (pricing.plan.contractId) {
            const [c] = await tx.insert(memberContracts).values({
                memberId: mid,
                templateId: pricing.plan.contractId,
                locationId: lid,
                memberPlanId: p.id,
            }).returning({
                id: memberContracts.id,
            });
            if (c) {
                unsignedDocs.push(c.id);
            }
        }

        if (locationState.waiverId && !ml.signedWaiverId) {
            const [w] = await tx.insert(memberContracts).values({
                memberId: mid,
                templateId: locationState.waiverId,
                locationId: lid,
                memberPlanId: p.id,
            }).returning({
                id: memberContracts.id,
            });
            if (w) {
                unsignedDocs.push(w.id);
            }
        }
    });

    triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((a) => {
        if (a) {
            broadcastAchievement(ml.member.userId, a);
        }
    }).catch((err) => {
        console.error("Error triggering purchase:", err);
    });

    return { ok: true, };
}
