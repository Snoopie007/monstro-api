import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { promos } from "@subtrees/schemas";

export const xPromos = new Elysia({ prefix: "/promos" })
    .get("/", async ({ params, status }) => {
        const { lid } = params as { lid: string };
        const promoList = await db.query.promos.findMany({
            where: (p, { eq }) => eq(p.locationId, lid),
            orderBy: [desc(promos.created)],
        });
        return status(200, { promos: promoList });
    })
    .post("/", async ({ params, body, status }) => {
        const { lid } = params as { lid: string };
        const {
            code,
            type,
            value,
            duration,
            durationInMonths,
            maxRedemptions,
            expiresAt,
            allowedPlans,
        } = body;

        const normalizedCode = code.trim().toUpperCase();
        const existing = await db.query.promos.findFirst({
            where: (p, { and, eq }) => and(eq(p.locationId, lid), eq(p.code, normalizedCode)),
        });

        if (existing) {
            return status(409, { error: "Promo code already exists for this location" });
        }

        const [promo] = await db.insert(promos).values({
            locationId: lid,
            code: normalizedCode,
            type,
            value,
            duration,
            ...(duration === "repeating" && durationInMonths ? { durationInMonths } : {}),
            ...(typeof maxRedemptions === "number" ? { maxRedemptions } : {}),
            ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
            ...(allowedPlans && allowedPlans.length > 0 ? { allowedPlans } : {}),
        }).returning();

        return status(201, { promo });
    }, {
        body: t.Object({
            code: t.String(),
            type: t.Union([t.Literal("percentage"), t.Literal("fixed_amount")]),
            value: t.Number(),
            duration: t.Union([t.Literal("once"), t.Literal("repeating"), t.Literal("forever")]),
            durationInMonths: t.Optional(t.Number()),
            maxRedemptions: t.Optional(t.Number()),
            expiresAt: t.Optional(t.String()),
            allowedPlans: t.Optional(t.Array(t.String())),
        }),
    })
    .patch("/:pid", async ({ params, body, status }) => {
        const { lid, pid } = params as { lid: string; pid: string };

        const [updated] = await db.update(promos).set({
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            ...(body.maxRedemptions !== undefined ? { maxRedemptions: body.maxRedemptions } : {}),
            ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
            updated: new Date(),
        }).where(and(eq(promos.id, pid), eq(promos.locationId, lid))).returning();

        if (!updated) {
            return status(404, { error: "Promo not found" });
        }

        return status(200, { promo: updated });
    }, {
        body: t.Object({
            isActive: t.Optional(t.Boolean()),
            maxRedemptions: t.Optional(t.Number()),
            expiresAt: t.Optional(t.Nullable(t.String())),
        }),
    })
    .post("/:pid/archive", async ({ params, status }) => {
        const { lid, pid } = params as { lid: string; pid: string };
        const [updated] = await db.update(promos)
            .set({ isActive: false, updated: new Date() })
            .where(and(eq(promos.id, pid), eq(promos.locationId, lid)))
            .returning();

        if (!updated) {
            return status(404, { error: "Promo not found" });
        }

        return status(200, { success: true, promo: updated });
    })
    .post("/validate", async ({ params, body, status }) => {
        const { lid } = params as { lid: string };
        const { pricingId, promoCode } = body;

        const normalizedPromoCode = promoCode.trim().toUpperCase();
        const promo = await db.query.promos.findFirst({
            where: and(eq(promos.locationId, lid), eq(promos.code, normalizedPromoCode), eq(promos.isActive, true)),
        });

        if (!promo) {
            return status(400, { ok: false, code: "PROMO_NOT_FOUND", message: "Invalid promo code" });
        }

        if (promo.expiresAt && new Date() > promo.expiresAt) {
            return status(400, { ok: false, code: "PROMO_EXPIRED", message: "Promo code has expired" });
        }

        if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
            return status(400, { ok: false, code: "PROMO_REDEMPTION_LIMIT_REACHED", message: "Promo code redemption limit reached" });
        }

        if (promo.allowedPlans && promo.allowedPlans.length > 0 && !promo.allowedPlans.includes(pricingId)) {
            return status(400, { ok: false, code: "PROMO_NOT_ALLOWED_FOR_PRICING", message: "Promo code is not valid for this pricing option" });
        }

        return status(200, {
            ok: true,
            promoId: promo.id,
            code: null,
            message: null,
        });
    }, {
        body: t.Object({
            pricingId: t.String(),
            promoCode: t.String(),
            memberId: t.Optional(t.String()),
            usageType: t.Optional(t.Union([t.Literal("subscription"), t.Literal("package")])),
        }),
    });
