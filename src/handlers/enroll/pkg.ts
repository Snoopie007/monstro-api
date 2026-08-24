import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { memberInvoices, memberPackages, promos, transactions } from "@subtrees/schemas";
import {
    calculateChargeDetails,
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs,
    triggerPurchase,
    fetchPromoDiscount,
    calculateThresholdDate,
    getAdditionalFeesForCheckout,
    getCheckoutContext,
    getMemberCheckoutContext,
    addMembertoGroup,
    type ChargeWithGatewayResult,
} from "@/utils";
import { broadcastAchievement } from "@/libs/broadcast/achievements";
import { generateUUID } from "subtrees/utils";
import { eq, sql } from "drizzle-orm";

export type EnrollPkgInput = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId?: string;
    paymentType: PaymentType;
    promoId?: string | null;
    attemptId: string;
    startDate?: string;
    expireDate?: string;
    totalClassLimit?: number;
    quoteOnly?: boolean;
};

export async function handleEnrollPackage(props: EnrollPkgInput) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId, attemptId, startDate, expireDate, totalClassLimit, quoteOnly = false } = props;
    const transactionId = generateUUID('txn_');

    const [checkout, pricing] = await Promise.all([
        paymentType === "cash"
            ? getMemberCheckoutContext({ lid, mid }).then((context) => ({
                ...context,
                gateway: null,
                gatewayCustomerId: null,
            }))
            : getCheckoutContext({ lid, mid }),
        db.query.memberPlanPricing.findFirst({
            where: (row, { eq }) => eq(row.id, priceId),
            with: { plan: true },
        }),
    ]);
    if (
        !pricing?.plan ||
        pricing.plan.locationId !== lid ||
        pricing.plan.archived ||
        pricing.plan.type !== "one-time"
    ) {
        throw new CheckoutError(404, "Pricing not found");
    }

    const { ml, taxRates, gateway, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const contractId = pricing.plan.contractId;
    const waiverId = locationState.waiverId;
    const templateIds = [contractId, waiverId].filter((id): id is string => Boolean(id));
    if (templateIds.length > 0) {
        const templates = await Promise.all(templateIds.map((templateId) =>
            db.query.contractTemplates.findFirst({
                where: (template, { eq, and }) => and(
                    eq(template.id, templateId),
                    eq(template.locationId, lid),
                ),
                columns: { id: true },
            }),
        ));
        if (templates.some((template) => !template)) {
            throw new CheckoutError(404, "Contract not found");
        }
    }

    const { planId, currency } = locationState;
    const signedWaiverId = ml.signedWaiverId;
    if (signedWaiverId) {
        if (!waiverId) {
            throw new CheckoutError(404, "Contract not found");
        }
        const signedWaiver = await db.query.memberContracts.findFirst({
            where: (memberContract, { eq, and, isNotNull }) => and(
                eq(memberContract.id, signedWaiverId),
                eq(memberContract.memberId, mid),
                eq(memberContract.locationId, lid),
                eq(memberContract.templateId, waiverId),
                isNotNull(memberContract.signedOn),
            ),
            with: {
                contractTemplate: {
                    columns: {
                        locationId: true,
                    },
                },
            },
        });
        if (!signedWaiver || signedWaiver.contractTemplate?.locationId !== lid) {
            throw new CheckoutError(404, "Contract not found");
        }
    }
    const discount = await fetchPromoDiscount(promoId ?? undefined, pricing, lid);
    const taxRate = taxRates.find((rate) => rate.isDefault) || taxRates[0];
    const productName = `${pricing.plan.name}/${pricing.name}`;
    const description = `Payment for ${productName}`;
    const additionalFees = await getAdditionalFeesForCheckout(lid, "package");
    const chargeDetails = calculateChargeDetails({
        amount: pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        planId,
        additionalFees,
    });
    // TODO: Reconcile quoteOnly with the Sites GET /api/enroll proxy before changing this early return.
    if (quoteOnly) {
        return {
            baseAmount: pricing.price,
            discount: chargeDetails.discount,
            tax: chargeDetails.tax,
            fees: chargeDetails.additionalFeeTotal,
            additionalFees: chargeDetails.additionalFeeLines.map((fee) => ({
                label: fee.name,
                amount: fee.price - (fee.discount ?? 0),
            })),
            total: chargeDetails.total,
            currency,
        };
    }
    const packageStart = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(packageStart.getTime())) throw new CheckoutError(400, "Invalid package start date");
    const endDate = expireDate
        ? new Date(expireDate)
        : pricing.expireThreshold && pricing.expireInterval
            ? calculateThresholdDate({
                startDate: packageStart,
                threshold: pricing.expireThreshold,
                interval: pricing.expireInterval,
            })
            : undefined;
    if (endDate && Number.isNaN(endDate.getTime())) throw new CheckoutError(400, "Invalid package expiration date");
    const metadata: Record<string, unknown> = {
        ...(gateway?.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
        } : {}),
        checkoutKind: "package",
    };
    const items = [{
        name: productName,
        quantity: 1,
        price: chargeDetails.unitCost,
        discount: chargeDetails.productDiscount,
    }, ...chargeDetails.additionalFeeLines];
    let charge: ChargeWithGatewayResult;
    if (paymentType === "cash") {
        charge = {
            status: "approved",
            paymentIntentId: `cash_${transactionId}`,
            paymentType: "cash",
            gatewayMetadata: { manualPayment: true },
        };
    } else {
        if (!gateway || !gatewayCustomerId || !paymentMethodId) {
            throw new CheckoutError(400, "Payment method is required");
        }
        charge = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            transactionId,
            paymentType,
            total: chargeDetails.total,
            feesAmount: chargeDetails.feesAmount,
            currency,
            description,
            note: `transId:${transactionId}|mid:${mid}|lid:${lid}|priceId:${pricing.id}`,
            metadata: { locationId: lid, memberId: mid, transactionId },
        });
    }

    switch (charge.status) {
        case "approved": {
            const now = new Date();
            let unsignedDocs: string[] = [];
            await db.transaction(async (tx) => {
                const [transaction] = await tx.insert(transactions).values({
                    id: transactionId,
                    memberId: mid,
                    locationId: lid,
                    total: chargeDetails.total,
                    subTotal: chargeDetails.subTotal,
                    tax: chargeDetails.tax,
                    feeAmount: chargeDetails.feesAmount,
                    items,
                    description,
                    type: "inbound",
                    status: "paid",
                    paymentMethodId,
                    paymentType,
                    currency,
                    chargeDate: now,
                    paymentIntentId: paymentType === "cash" ? null : charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    activities: [{
                        at: now.toISOString(),
                        reason: "Payment succeeded",
                        paymentType: charge.paymentType ?? paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }],
                }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
                if (!transaction) throw new CheckoutError(202, "Payment is being finalized; do not retry");

                const [pkg] = await tx.insert(memberPackages).values({
                    locationId: lid,
                    memberId: mid,
                    totalClassLimit: totalClassLimit ?? pricing.plan.totalClassLimit ?? 0,
                    memberPlanPricingId: pricing.id,
                    promoId: promoId ?? null,
                    paymentType,
                    startDate: packageStart,
                    expireDate: endDate,
                    status: "active",
                }).returning({ id: memberPackages.id });
                if (!pkg) throw new Error("Failed to create package");

                const [invoice] = await tx.insert(memberInvoices).values({
                    ...chargeDetails,
                    description,
                    items,
                    memberId: mid,
                    locationId: lid,
                    memberPlanId: pkg.id,
                    paymentType,
                    currency,
                    dueDate: new Date(),
                    transactionId,
                    status: "paid",
                    paid: true,
                }).returning({ id: memberInvoices.id });
                if (!invoice) throw new Error("Failed to create invoice");

                if (promoId) {
                    await tx.update(promos).set({
                        redemptionCount: sql`${promos.redemptionCount} + 1`,
                    }).where(eq(promos.id, promoId));
                }

                unsignedDocs = await createEnrollUnsignedDocs(tx, {
                    mid,
                    lid,
                    memberPlanId: pkg.id,
                    contractId,
                    waiverId,
                    signedWaiverId,
                });
            });

            triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((achievement) => {
                if (achievement) broadcastAchievement(ml.member.userId, achievement);
            }).catch((error) => console.error("Error triggering purchase:", error));
            if (pricing.plan.groupId && ml.member.userId) {
                addMembertoGroup(pricing.plan.groupId, ml.member.userId)
                    .catch((error) => console.error("Error adding package member to group:", error));
            }
            return { ok: true, unsignedDocs };
        }
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                memberId: mid,
                locationId: lid,
                total: chargeDetails.total,
                subTotal: chargeDetails.subTotal,
                tax: chargeDetails.tax,
                feeAmount: chargeDetails.feesAmount,
                items,
                description,
                type: "inbound",
                status: "failed",
                paymentMethodId,
                paymentType,
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
            throw new CheckoutError(400, charge.failureReason);
        }
        case "uncertain":
            throw new CheckoutError(202, "Payment status is unknown; do not retry");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
