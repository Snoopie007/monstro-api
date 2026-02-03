import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlans, planPrograms } from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";

  try {
    const pkgs = await db.query.memberPlans.findMany({
      where: (memberPlans, { eq, and }) =>
        and(
          eq(memberPlans.locationId, params.id),
          eq(memberPlans.type, "one-time"),
          eq(memberPlans.archived, archived)
        ),
      with: {
        planPrograms: {
          with: {
            program: true,
          },
        },
        pricingOptions: true,
      },
    });

    return NextResponse.json(pkgs, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  const { programs, ...data } = await req.json();

  try {
    const plan = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(memberPlans)
        .values({
          ...data,
          locationId: params.id,
          type: "one-time",
        })
        .returning();

      if (programs && programs.length > 0) {
        await tx.insert(planPrograms).values(
          programs.map((program: string) => ({
            planId: plan.id,
            programId: program,
          }))
        );
      }

      return plan;
    });

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
