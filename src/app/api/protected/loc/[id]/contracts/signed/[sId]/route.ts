import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';

export async function GET(
	req: NextRequest,
	props: { params: Promise<{ sId: number }> }
) {
	try {
		const { sId } = await props.params;


		return NextResponse.json({ success: true }, { status: 200 });

	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

	}
}
