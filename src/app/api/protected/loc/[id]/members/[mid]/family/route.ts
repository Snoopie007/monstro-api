import { NextResponse } from 'next/server';

import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { programs } from '@/db/schemas/programs';
import { memberSubscriptions, memberPlans, memberPackages } from '@/db/schemas/MemberPlans';


type Props = {
    mid: number,
    id: number
}

export async function GET(req: Request, props: { params: Promise<Props> }) {
    const params = await props.params;
    try {

        const subs = await db.select({
            planName: memberPlans.name,
            programName: programs.name,
            subscriptionId: memberSubscriptions.id,
            planFamilyLimit: memberPlans.familyMemberLimit,
        }).from(memberSubscriptions)
            .where(and(eq(memberSubscriptions.payerId, params.mid), eq(memberSubscriptions.locationId, params.id)))
            .innerJoin(memberPlans, and(eq(memberSubscriptions.memberPlanId, memberPlans.id), eq(memberPlans.family, true)))
            .innerJoin(programs, eq(memberPlans.programId, programs.id));

        const pkgs = await db.select({
            planName: memberPlans.name,
            programName: programs.name,
            packageId: memberPackages.id,
            planFamilyLimit: memberPlans.familyMemberLimit,
        }).from(memberPackages)
            .where(and(eq(memberPackages.payerId, params.mid), eq(memberPackages.locationId, params.id)))
            .innerJoin(memberPlans, and(eq(memberPackages.memberPlanId, memberPlans.id), eq(memberPlans.family, false)))
            .innerJoin(programs, eq(memberPlans.programId, programs.id));


        //Reorganize
        // How are in the plan already

        return NextResponse.json([...subs, ...pkgs], { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
