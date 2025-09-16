import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlans, planPrograms } from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const pkgs = await db.query.memberPlans.findMany({
      where: (memberPlans, { eq, and }) =>
        and(
          eq(memberPlans.locationId, params.id),
          eq(memberPlans.type, "one-time")
        ),
      with: {
        planPrograms: {
          with: {
            program: true,
          },
        },
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

  const { amount, programs, ...data } = await req.json();

  try {
    const plan = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(memberPlans)
        .values({
          ...data,
          locationId: params.id,
          price: amount,
          programId: params.id,
        })
        .returning({ id: memberPlans.id });

      await tx.insert(planPrograms).values(
        programs.map((program: number) => ({
          planId: plan.id,
          programId: program,
        }))
      );

      return plan;
    });

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
