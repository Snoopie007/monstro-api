import { db } from "@/db/db";
import type Elysia from "elysia";
import { t } from "elysia";
import { calcTotals } from "./shared";

export async function previewInvoiceRoutes(app: Elysia) {
    return app.post("/preview", async ({ body, params, status }) => {
        const { lid } = params as { lid: string };
        const { memberId, items, type, selectedSubscriptionId, subscriptionId, tax = 0, discount = 0 } = body;

        const member = await db.query.members.findFirst({
            where: (m, { eq }) => eq(m.id, memberId),
        });

        if (!member) {
            return status(404, { error: "Member not found" });
        }

        if (type === "from-subscription") {
            const sid = selectedSubscriptionId || subscriptionId;
            if (!sid) {
                return status(400, { error: "subscriptionId is required" });
            }
            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid), eq(s.memberId, memberId)),
                with: { pricing: { with: { plan: true } } },
            });
            if (!sub || !sub.pricing) {
                return status(404, { error: "Subscription not found" });
            }

            const previewItems = [{
                name: `${sub.pricing.plan?.name || "Plan"} - ${sub.pricing.name}`,
                quantity: 1,
                price: sub.pricing.price,
                description: sub.pricing.plan?.description || "",
            }];
            const totals = calcTotals(previewItems, tax, discount);
            return status(200, {
                preview: {
                    subtotal: totals.subtotal,
                    tax_total: tax,
                    amount_due: totals.total,
                    currency: sub.pricing.currency || "usd",
                    formatted_lines: previewItems.map((item) => ({
                        description: `${item.name}${item.description ? ` - ${item.description}` : ""}`,
                        amount: item.price * item.quantity,
                        quantity: item.quantity,
                        currency: sub.pricing.currency || "usd",
                    })),
                    customer_info: {
                        name: `${member.firstName} ${member.lastName}`,
                        email: member.email,
                    },
                },
                summary: {
                    total_items: previewItems.length,
                    subtotal_cents: totals.subtotal,
                    tax_cents: tax,
                    discount_cents: discount,
                    total_cents: totals.total,
                    currency: sub.pricing.currency || "usd",
                },
            });
        }

        if (!items || items.length === 0) {
            return status(400, { error: "items are required" });
        }

        const previewItems = items.map((item) => ({
            name: item.name,
            description: item.description || "",
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
        }));
        const totals = calcTotals(previewItems, tax, discount);

        return status(200, {
            preview: {
                subtotal: totals.subtotal,
                tax_total: tax,
                amount_due: totals.total,
                currency: "usd",
                formatted_lines: previewItems.map((item) => ({
                    description: `${item.name}${item.description ? ` - ${item.description}` : ""}`,
                    amount: item.price * item.quantity,
                    quantity: item.quantity,
                    currency: "usd",
                })),
                customer_info: {
                    name: `${member.firstName} ${member.lastName}`,
                    email: member.email,
                },
            },
            summary: {
                total_items: previewItems.length,
                subtotal_cents: totals.subtotal,
                tax_cents: tax,
                discount_cents: discount,
                total_cents: totals.total,
                currency: "usd",
            },
        });
    }, {
        body: t.Object({
            memberId: t.String(),
            type: t.Optional(t.Union([
                t.Literal("one-off"),
                t.Literal("recurring"),
                t.Literal("from-subscription"),
            ])),
            subscriptionId: t.Optional(t.String()),
            selectedSubscriptionId: t.Optional(t.String()),
            items: t.Optional(t.Array(t.Object({
                name: t.String(),
                description: t.Optional(t.String()),
                quantity: t.Number(),
                price: t.Number(),
            }))),
            tax: t.Optional(t.Number()),
            discount: t.Optional(t.Number()),
        }),
    });
}
