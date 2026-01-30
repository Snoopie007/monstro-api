import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { promos } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { VendorStripePayments } from "@/libs/server/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string; pid: string }> }
) {
  const { lid, pid } = await params;

  try {
    const promo = await db.query.promos.findFirst({
      where: (p, { eq, and }) => and(
        eq(p.id, pid),
        eq(p.locationId, lid)
      ),
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ promo });
  } catch (error) {
    console.error("[PROMO GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string; pid: string }> }
) {
  const { lid, pid } = await params;

  try {
    const body = await req.json();

    const schema = z.object({
      isActive: z.boolean(),
    });

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { isActive } = result.data;

    const [updated] = await db.update(promos)
      .set({
        isActive,
        updated: new Date(),
      })
      .where(and(
        eq(promos.id, pid),
        eq(promos.locationId, lid)
      ))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ promo: updated });
  } catch (error) {
    console.error("[PROMO PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update promo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string; pid: string }> }
) {
  const { lid, pid } = await params;

  try {
    const promo = await db.query.promos.findFirst({
      where: (p, { eq, and }) => and(
        eq(p.id, pid),
        eq(p.locationId, lid)
      ),
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    const stripe = new VendorStripePayments();
    await stripe.deleteCoupon(promo.stripeCouponId);

    const [archived] = await db.update(promos)
      .set({ isActive: false, updated: new Date() })
      .where(and(
        eq(promos.id, pid),
        eq(promos.locationId, lid)
      ))
      .returning();

    return NextResponse.json({ promo: archived });
  } catch (error) {
    console.error("[PROMO DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    );
  }
}