import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import Stripe from "stripe";
import { memberPlans, memberSubscriptions, planPrograms } from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";


export async function PUT(req: NextRequest, props: { params: Promise<{ id: string, pid: string }> }) {
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

        await db.update(memberPlans).set({
            ...rest,
        }).where(eq(memberPlans.id, pid));

        const newPrograms = programs.filter((programId: string) => !plan.planPrograms.some((program) => program.programId === programId));
        if (newPrograms.length > 0) {
            await db.insert(planPrograms).values(newPrograms.map((programId: string) => ({ planId: pid, programId })));
        }

        const removedPrograms = plan.planPrograms.filter((program) => !programs.includes(program.programId));
        if (removedPrograms.length > 0) {
            await db.delete(planPrograms).where(inArray(planPrograms.programId, removedPrograms.map((program) => program.programId)));
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update subscription plan." }, { status: 500 });
    }
}