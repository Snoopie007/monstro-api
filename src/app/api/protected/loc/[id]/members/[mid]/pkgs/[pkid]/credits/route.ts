import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPackages } from "@/db/schemas";
import { eq } from "drizzle-orm";

type Params = {
  id: string;
  mid: string;
  pkid: string;
};

/**
 * GET /api/protected/loc/[id]/members/[mid]/pkgs/[pkid]/credits
 * 
 * Get make-up credits info for a package
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<Params> }
) {
  const params = await props.params;

  try {
    const pkg = await db.query.memberPackages.findFirst({
      where: eq(memberPackages.id, params.pkid),
      with: {
        pricing: {
          with: {
            plan: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    const planMakeUpCredits = pkg.pricing?.plan?.makeUpCredits ?? 0;
    const usedMakeUpCredits = pkg.makeUpCredits;
    const remaining = Math.max(0, planMakeUpCredits - usedMakeUpCredits);

    return NextResponse.json({
      used: usedMakeUpCredits,
      limit: planMakeUpCredits,
      remaining,
      allowCarryOver: pkg.allowMakeUpCarryOver,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch credits info" },
      { status: 500 }
    );
  }
}


