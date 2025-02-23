import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

import { contractTemplates } from '@/db/schemas';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const session = await auth();
	const { searchParams } = new URL(req.url);
	const query = searchParams.get("withDraft") || true;
	try {
		if (session) {

			const templates = await db.query.contractTemplates.findMany({
				where: (templates, { eq, and, isNull, inArray }) => (and(eq(templates.locationId, params.id), eq(templates.deleted, isNull(templates.deleted)), inArray(templates.isDraft, query === 'true' ? [true, false] : [false]))),
				with: {
					plans: true
				}
			});

			return NextResponse.json(templates, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const session = await auth();
	try {
		if (session) {

			const [{ id }] = await db.insert(contractTemplates).values({
				vendorId: session.user.vendorId,
				locationId: params.id,
				content: "",
				title: "",
				isDraft: true,
				editable: true,
				created: new Date(),
			}).returning({ id: contractTemplates.id });

			return NextResponse.json({ id }, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}