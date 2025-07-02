import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { Member } from '@/types';

export async function GET(req: Request, props: { params: Promise<{ pid: string, id: string }> }) {
	const params = await props.params;
	try {
		const plans = await db.query.planPrograms.findMany({
			where: (planPrograms, { eq }) => eq(planPrograms.programId, params.pid)
		})

		const plansIds = plans.map((plan) => plan.planId)

		const subscriptions = await db.query.memberSubscriptions.findMany({
			where: (memberSubscriptions, { inArray }) => inArray(memberSubscriptions.memberPlanId, plansIds),
			with: {
				member: true
			}
		})

		const packages = await db.query.memberPackages.findMany({
			where: (memberPackages, { inArray }) => inArray(memberPackages.memberPlanId, plansIds),
			with: {
				member: true
			}
		})

		const members: Member[] = [];
		if (subscriptions && subscriptions.length) {
			subscriptions.forEach((subscription) => {
				members.push(subscription.member);
			});
		}
		if (packages && packages.length) {
			packages.forEach((pkg) => {
				members.push(pkg.member);
			});
		}
		return NextResponse.json(members, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}