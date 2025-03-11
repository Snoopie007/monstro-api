import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const session = await auth();
	try {
		if (session) {
			const contracts = await db.query.memberContracts.findMany({
				where: (memberContracts, { eq }) => eq(memberContracts.locationId, params.id),
				with: {
					member: true,
					contractTemplate: true,
					plan: {
						with: {
							program: true
						}
					},
				}
			});

			return NextResponse.json(contracts, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}