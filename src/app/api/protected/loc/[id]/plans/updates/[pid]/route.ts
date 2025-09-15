import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import Stripe from "stripe";
import { memberPlans, memberSubscriptions, planPrograms } from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await props.params;
  const { programs, ...rest } = await req.json();

  try {
    const plan = await db.query.memberPlans.findFirst({
      where: (plan, { eq }) => eq(plan.id, pid),
      with: {
        planPrograms: true,
      },
    });

    if (!plan) {
      throw new Error("Subscription plan not found.");
    }

    // Validate family member limit can only be increased
    if (
      rest.familyMemberLimit !== undefined &&
      rest.familyMemberLimit < (plan.familyMemberLimit || 0)
    ) {
      throw new Error(
        "Family member limit can only be increased, not decreased."
      );
    }

    // Prepare program changes
    const newPrograms = programs.filter(
      (programId: string) =>
        !plan.planPrograms.some((program) => program.programId === programId)
    );

    const removedPrograms = plan.planPrograms.filter(
      (program) => !programs.includes(program.programId)
    );

    // Execute all database operations in a transaction after validations
    await db.transaction(async (tx) => {
      await tx
        .update(memberPlans)
        .set({
          ...rest,
        })
        .where(eq(memberPlans.id, pid));

      if (newPrograms.length > 0) {
        await tx
          .insert(planPrograms)
          .values(
            newPrograms.map((programId: string) => ({ planId: pid, programId }))
          );
      }

      if (removedPrograms.length > 0) {
        await tx.delete(planPrograms).where(
          inArray(
            planPrograms.programId,
            removedPrograms.map((program) => program.programId)
          )
        );
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update subscription plan." },
      { status: 500 }
    );
  }
}
