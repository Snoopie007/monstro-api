import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';
import { tryCatch } from '@/libs/utils';

export async function GET(
	req: NextRequest,
	props: { params: Promise<{ sId: string }> }
) {
	try {
		const { sId } = await props.params;

	if (!sId) {
		return NextResponse.json({ error: 'SID is required' }, { status: 400 });
	}


	const contractList = await db.query.memberContracts.findMany({
		where: (contract, { eq }) => eq(contract.id, Number(sId)),
		with: {
			member: true,
			contractTemplate: true
		}
	});

	if (!contractList || contractList.length === 0) {
		return NextResponse.json({ error: 'No contracts found for the provided SID' }, { status: 404 });
	}

	return NextResponse.json(contractList, { status: 200 });
		
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
		
	}
}
