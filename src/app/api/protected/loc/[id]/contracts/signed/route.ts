import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const query = req.nextUrl.searchParams;
	const page = query.get("page") || 1;
	const limit = query.get("limit") || 20;

	try {
		const contracts = await db.query.memberContracts.findMany({
			where: (memberContracts, { eq }) => eq(memberContracts.locationId, params.id),
			with: {
				member: true,
				contractTemplate: true,
			},
			limit: Number(limit),
			offset: (Number(page) - 1) * Number(limit),
		});


		return NextResponse.json(contracts, { status: 200 });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: err }, { status: 500 })
	}
}