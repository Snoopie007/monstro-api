import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';

export async function GET(
	req: NextRequest,
	props: { params: Promise<{ sid: string }> }
) {
	const { sid } = await props.params;

	if (!sid) {
		return NextResponse.json({ error: 'SID is required' }, { status: 400 });
	}


	const contractList = await db.query.memberContracts.findMany({
		where: (contract, { eq }) => eq(contract.id, Number(sid)),
		with: {
			member: true,
			contractTemplate: true
		}
	});

	if (!contractList || contractList.length === 0) {
		return NextResponse.json({ error: 'No contracts found for the provided SID' }, { status: 404 });
	}

	return NextResponse.json(contractList, { status: 200 });
}
