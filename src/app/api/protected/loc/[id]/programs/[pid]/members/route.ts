import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { Member } from '@/types';

export async function GET(req: Request, props: { params: Promise<{ pid: number, id: number }> }) {
	const params = await props.params;
	try {
		const subscription = await db.query.memberSubscriptions.findMany({
			where: (members, { eq }) => eq(members.programId, params.pid),
			with: {
				beneficiary: true
			}
		});
		const packages = await db.query.memberPackages.findMany({
			where: (packages, { eq }) => eq(packages.programId, params.pid),
			with: {
				beneficiary: true
			}
		});
		const members: Member[] = [];
		if (subscription && subscription.length) {
			subscription.forEach((subscription) => {
				members.push(subscription.beneficiary);
			});
		}
		if (packages && packages.length) {
			packages.forEach((pkg) => {
				members.push(pkg.beneficiary);
			});
		}
		return NextResponse.json(members, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}