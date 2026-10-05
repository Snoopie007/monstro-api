import { getDeferredBilling, resumeDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import {
    removeRenewalJobs,
    scheduleCashRenewal,
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import { memberSubscriptions } from "@/subtrees/schemas";
import type { SubscriptionJobData } from "@/subtrees/bullmq/types";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { BillingContextError, findInFlightSubscriptionAttempt, resolveSubscriptionBillingContext } from "./billingContext";
import type { PromoDiscount } from "./shared";
import type { SubscriptionBillingContext } from "./billingContext";
import { getNextBillingDate } from "./shared";
import { getStripeMigration, getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
export async function resumeSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/resume", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { resumeAt } = body;

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                member: {
                    columns: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                pricing: {
                    with: {
                        plan: true,
                    },
                },
                location: {
                    with: {
                        taxRates: true,
                    },
                    columns: {
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        country: true,
                        vendorId: true,
                    },
                },
            },
        });

        if (!sub || !sub.member || !sub.location || !sub.pricing) {
            return status(404, { error: "Subscription billing definition not found" });
        }
        if (sub.parentId) {
            return status(400, { error: "Only root subscriptions can be resumed", code: "SUBSCRIPTION_CHILD" });
        }
        if (sub.status === "canceled" || (sub.cancelAt && sub.cancelAt.getTime() <= Date.now())) {
            return status(400, { error: "Canceled subscriptions cannot be resumed", code: "SUBSCRIPTION_CANCELED" });
        }
        const deferred = getDeferredBilling(sub.metadata);
        if (deferred && sub.currentPeriodEnd <= new Date()) {
            return status(409, { error: "A billing date passed while this subscription was paused. Cancel it and enroll again with a new first payment date to avoid charging for paused access." });
        }
        if (deferred && resumeAt && new Date(resumeAt).getTime() !== sub.currentPeriodEnd.getTime()) {
            return status(400, { error: "Clear the date override to preserve the chosen billing schedule" });
        }
        const inFlight = await findInFlightSubscriptionAttempt(sub.id);
        if (inFlight) {
            return status(409, {
                error: "A payment attempt is still in flight; resolve it before resuming",
                code: "PAYMENT_ATTEMPT_IN_FLIGHT",
                invoiceId: inFlight.invoice?.id,
                attemptStatus: inFlight.status,
            });
        }

        let billingContext: SubscriptionBillingContext | null = null;
        if (sub.paymentType !== "cash") {
            try {
                billingContext = await resolveSubscriptionBillingContext(sub);
            } catch (error) {
                if (error instanceof BillingContextError) {
                    return status(400, { error: error.message, code: error.code });
                }
                throw error;
            }
        }
        const location = sub.location;
        const nextBillingAt = resumeAt ? new Date(resumeAt) : getNextBillingDate(sub);
        if (
            billingContext?.gateway.service === "stripe"
            && getStripeMigration(sub.metadata)
            && nextBillingAt.getTime() !== getNextBillingDate(sub).getTime()
        ) {
            return status(400, {
                error: "Imported subscriptions must resume on their existing billing due date. Clear the date override.",
            });
        }


        const billingQuote = getSubscriptionBillingQuote(sub);

        const resumedMetadata = deferred
            ? { ...sub.metadata, deferredBilling: resumeDeferredBilling(deferred, new Date()) }
            : sub.metadata;

        const resumedStatus = sub.trialEnd && isFuture(sub.trialEnd) ? "trialing" : "active";
        await db.transaction(async (tx) => {
            const values = {
                status: resumedStatus,
                metadata: resumedMetadata,
                cancelAt: deferred ? sub.cancelAt : null,
                cancelAtPeriodEnd: false,
                updated: new Date(),
            } as const;
            await tx.update(memberSubscriptions).set(values).where(eq(memberSubscriptions.id, sid));
            const { metadata: _metadata, ...accessValues } = values;
            await tx.update(memberSubscriptions).set(accessValues).where(eq(memberSubscriptions.parentId, sid));
        });

        if (sub.paymentType !== "cash" && billingContext) {
            const promoMeta = sub.metadata?.promo as { discount?: PromoDiscount } | undefined;
            const payload: SubscriptionJobData = {
                sid: sub.id,
                lid,
                member: {
                    firstName: sub.member.firstName,
                    lastName: sub.member.lastName,
                    email: sub.member.email,
                },
                location: {
                    name: location.name,
                    email: location.email,
                    phone: location.phone,
                    address: location.address,
                },
                taxRate: location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                pricing: {
                    name: billingQuote.name,
                    price: billingQuote.price,
                    interval: billingQuote.interval,
                    intervalThreshold: billingQuote.intervalThreshold,
                },
                ...((billingContext.gateway.service === "stripe" && getStripeMigration(sub.metadata)) || deferred
                    ? { expectedDueAt: nextBillingAt.toISOString() }
                    : {}),
                ...(promoMeta?.discount ? { discount: promoMeta.discount } : {}),
            };

            await removeRenewalJobs(sub.id);
            if (["month", "year"].includes(billingQuote.interval) && billingQuote.intervalThreshold === 1) {
                await scheduleCronBasedRenewal({
                    startDate: nextBillingAt,
                    interval: billingQuote.interval as "month" | "year",
                    data: payload,
                });
            } else {
                await scheduleRecursiveRenewal({
                    startDate: nextBillingAt,
                    data: {
                        ...payload,
                        recurrenceCount: 1,
                    },
                });
            }
        }

        if (sub.paymentType === "cash" && deferred) {
            await scheduleCashRenewal(nextBillingAt, {
                sid, lid, vendorId: location.vendorId, member: sub.member, location,
                pricing: billingQuote, taxRate: location.taxRates?.find(t => t.isDefault)?.percentage || 0,
            });
        }

        return status(200, {
            status: sub.trialEnd && isFuture(sub.trialEnd) ? "trialing" : "active",
            nextBillingAt,
            scheduler: { resumed: true },
        });
    }, {
        body: t.Object({
            resumeAt: t.Optional(t.String()),
        }),
    });
}
