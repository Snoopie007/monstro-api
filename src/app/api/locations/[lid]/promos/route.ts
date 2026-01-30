import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { promos, integrations } from "@/db/schemas";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { VendorStripePayments } from "@/libs/server/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string }> }
) {
  const { lid } = await params;

  try {
    const promoList = await db.query.promos.findMany({
      where: (p, { eq }) => eq(p.locationId, lid),
      orderBy: [desc(promos.created)],
    });

    return NextResponse.json({ promos: promoList });
  } catch (error) {
    console.error("[PROMOS GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promos" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string }> }
) {
  const { lid } = await params;

  try {
    const body = await req.json();

    const schema = z.object({
      code: z.string().min(1).max(50),
      type: z.enum(["percentage", "fixed_amount"]),
      value: z.number().int().positive(),
      duration: z.enum(["once", "repeating", "forever"]),
      durationInMonths: z.number().int().optional(),
      maxRedemptions: z.number().int().optional(),
      expiresAt: z.string().datetime().optional(),
    });

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const {
      code,
      type,
      value,
      duration,
      durationInMonths,
      maxRedemptions,
      expiresAt,
    } = result.data;

    const existing = await db.query.promos.findFirst({
      where: (p, { eq, and }) => and(
        eq(p.locationId, lid),
        eq(p.code, code)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists for this location" },
        { status: 409 }
      );
    }

    const integration = await db.query.integrations.findFirst({
      where: (i, { eq, and }) => and(
        eq(i.locationId, lid),
        eq(i.service, "stripe")
      ),
    });

    if (!integration?.accountId) {
      return NextResponse.json(
        { error: "Location has no Stripe Connect account" },
        { status: 400 }
      );
    }

    const stripe = new VendorStripePayments();

    const coupon = await stripe.createCoupon({
      name: code,
      ...(type === "percentage" ? { percentOff: value } : { amountOff: value, currency: "usd" }),
      duration,
      ...(duration === "repeating" && durationInMonths && { durationInMonths }),
      ...(maxRedemptions && { maxRedemptions }),
      ...(expiresAt && { redeemBy: new Date(expiresAt) }),
      metadata: { locationId: lid },
    });

    const promotionCode = await stripe.createPromotionCode({
      coupon: coupon.id,
      code,
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      ...(maxRedemptions && { maxRedemptions }),
    });

    const [newPromo] = await db.insert(promos).values({
      locationId: lid,
      stripeCouponId: coupon.id,
      stripePromoId: promotionCode.id,
      code,
      type,
      value,
      duration,
      ...(durationInMonths && { durationInMonths }),
      ...(maxRedemptions && { maxRedemptions }),
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    }).returning();

    return NextResponse.json({ promo: newPromo }, { status: 201 });

  } catch (error) {
    console.error("[PROMOS POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create promo" },
      { status: 500 }
    );
  }
}