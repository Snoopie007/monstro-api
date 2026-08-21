import { db } from "@/db/db";
import { canAccessLocation } from "@/utils/merchandise";
import {
	additionalFeeCheckoutTypes,
	additionalFees,
} from "@subtrees/schemas";
import { and, asc, eq } from "drizzle-orm";
import { Elysia, t, type Context } from "elysia";

const checkoutTypeSchema = t.Union([
	t.Literal("package"),
	t.Literal("subscription"),
	t.Literal("course"),
	t.Literal("event"),
	t.Literal("order"),
]);

const feeTypeSchema = t.Union([
	t.Literal("fixed"),
	t.Literal("percentage"),
]);

const editableFeeFields = {
	label: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
	description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
	type: t.Optional(feeTypeSchema),
	amount: t.Optional(t.Integer({ minimum: 1, maximum: 2_147_483_647 })),
	checkoutTypes: t.Optional(t.Array(checkoutTypeSchema, { minItems: 1, maxItems: 5 })),
	active: t.Optional(t.Boolean()),
};

type XAuthContext = Context & { vendorId?: string; staffId?: string };
type AdditionalFeeAccessContext = {
	additionalFeeLocationAccess: { allowed: boolean };
};

function normalizeCheckoutTypes(
	checkoutTypes: Array<(typeof additionalFeeCheckoutTypes)[number]>,
) {
	return additionalFeeCheckoutTypes.filter((checkoutType) =>
		checkoutTypes.includes(checkoutType),
	);
}

function validateFee(input: {
	label: string;
	type: "fixed" | "percentage";
	amount: number;
	checkoutTypes: Array<(typeof additionalFeeCheckoutTypes)[number]>;
}) {
	if (!input.label.trim()) return "Fee name is required";
	if (input.type === "percentage" && input.amount > 10_000) {
		return "Percentage fees cannot exceed 100%";
	}
	if (normalizeCheckoutTypes(input.checkoutTypes).length === 0) {
		return "Select at least one checkout type";
	}
	return null;
}

export const xAdditionalFees = new Elysia({ prefix: "/additional-fees" })
	.resolve(async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		return {
			additionalFeeLocationAccess: await canAccessLocation(lid, vendorId, staffId),
		};
	})
	.get("/", async (ctx) => {
		const { params, status, additionalFeeLocationAccess } = ctx as typeof ctx & AdditionalFeeAccessContext;
		if (!additionalFeeLocationAccess.allowed) {
			return status(403, { error: "Location access denied" });
		}
		const { lid } = params as { lid: string };
		const fees = await db.query.additionalFees.findMany({
			where: eq(additionalFees.locationId, lid),
			orderBy: [asc(additionalFees.created), asc(additionalFees.id)],
		});
		return status(200, { fees });
	})
	.post("/", async (ctx) => {
		const { params, body, status, additionalFeeLocationAccess } = ctx as typeof ctx & AdditionalFeeAccessContext;
		if (!additionalFeeLocationAccess.allowed) {
			return status(403, { error: "Location access denied" });
		}
		const { lid } = params as { lid: string };
		const label = body.label.trim();
		const checkoutTypes = normalizeCheckoutTypes(body.checkoutTypes);
		const validationError = validateFee({ ...body, label, checkoutTypes });
		if (validationError) return status(400, { error: validationError });

		const [fee] = await db.insert(additionalFees).values({
			locationId: lid,
			label,
			description: body.description?.trim() || null,
			type: body.type,
			amount: body.amount,
			checkoutTypes,
			active: body.active ?? true,
		}).returning();

		return status(201, { fee });
	}, {
		body: t.Object({
			label: t.String({ minLength: 1, maxLength: 60 }),
			description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
			type: feeTypeSchema,
			amount: t.Integer({ minimum: 1, maximum: 2_147_483_647 }),
			checkoutTypes: t.Array(checkoutTypeSchema, { minItems: 1, maxItems: 5 }),
			active: t.Optional(t.Boolean()),
		}),
	})
	.patch("/:feeId", async (ctx) => {
		const { params, body, status, additionalFeeLocationAccess } = ctx as typeof ctx & AdditionalFeeAccessContext;
		if (!additionalFeeLocationAccess.allowed) {
			return status(403, { error: "Location access denied" });
		}
		const { lid, feeId } = params as { lid: string; feeId: string };
		const existing = await db.query.additionalFees.findFirst({
			where: and(eq(additionalFees.id, feeId), eq(additionalFees.locationId, lid)),
		});
		if (!existing) return status(404, { error: "Additional fee not found" });

		const label = body.label?.trim() ?? existing.label;
		const checkoutTypes = normalizeCheckoutTypes(body.checkoutTypes ?? existing.checkoutTypes);
		const nextFee = {
			label,
			type: body.type ?? existing.type,
			amount: body.amount ?? existing.amount,
			checkoutTypes,
		};
		const validationError = validateFee(nextFee);
		if (validationError) return status(400, { error: validationError });

		const [fee] = await db.update(additionalFees).set({
			...nextFee,
			...(body.description !== undefined
				? { description: body.description?.trim() || null }
				: {}),
			...(body.active !== undefined ? { active: body.active } : {}),
			updated: new Date(),
		}).where(
			and(eq(additionalFees.id, feeId), eq(additionalFees.locationId, lid)),
		).returning();

		return status(200, { fee });
	}, {
		body: t.Object(editableFeeFields),
	})
	.delete("/:feeId", async (ctx) => {
		const { params, status, additionalFeeLocationAccess } = ctx as typeof ctx & AdditionalFeeAccessContext;
		if (!additionalFeeLocationAccess.allowed) {
			return status(403, { error: "Location access denied" });
		}
		const { lid, feeId } = params as { lid: string; feeId: string };
		const [deleted] = await db.delete(additionalFees)
			.where(and(eq(additionalFees.id, feeId), eq(additionalFees.locationId, lid)))
			.returning({ id: additionalFees.id });

		if (!deleted) return status(404, { error: "Additional fee not found" });
		return status(200, { success: true });
	});
