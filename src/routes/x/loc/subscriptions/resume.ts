import { db } from "@/db/db";
import {
    removeRenewalJobs,
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import { memberSubscriptions } from "@subtrees/schemas";
import type { SubscriptionJobData } from "@subtrees/bullmq/types";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { type PromoDiscount } from "./shared";

export async function resumeSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/resume", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { resumeAt } = body;

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                member: {
                    columns: {
                        stripeCustomerId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                pricing: true,
                location: {
                    with: {
                        taxRates: true,
                    },
                },
            },
        });

        if (!sub || !sub.pricing) {
            return status(404, { error: "Subscription not found" });
        }

        const nextBillingAt = resumeAt ? new Date(resumeAt) : new Date();

        await db.update(memberSubscriptions).set({
            status: sub.trialEnd && isFuture(sub.trialEnd) ? "trialing" : "active",
            cancelAtPeriodEnd: false,
            updated: new Date(),
        }).where(eq(memberSubscriptions.id, sid));

        if (sub.paymentType !== "cash" && sub.member?.stripeCustomerId) {
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
                    name: sub.location?.name || "",
                    email: sub.location?.email || null,
                    phone: sub.location?.phone || null,
                    address: sub.location?.address || null,
                },
                taxRate: sub.location?.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                stripeCustomerId: sub.member.stripeCustomerId,
                pricing: {
                    name: sub.pricing.name,
                    price: sub.pricing.price,
                    currency: sub.pricing.currency,
                    interval: sub.pricing.interval!,
                    intervalThreshold: sub.pricing.intervalThreshold!,
                },
                ...(promoMeta?.discount ? { discount: promoMeta.discount } : {}),
            };

            await removeRenewalJobs(sub.id);
            if (["month", "year"].includes(sub.pricing.interval || "") && sub.pricing.intervalThreshold === 1) {
                await scheduleCronBasedRenewal({
                    startDate: nextBillingAt,
                    interval: sub.pricing.interval as "month" | "year",
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
