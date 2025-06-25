import { db } from '@/db/db';
import { importMembers } from '@/db/schemas/ImportMembers';
import { NextResponse } from 'next/server';
import { EmailSender } from "@/libs/server/emails";
import { MonstroData } from '@/libs/data';
import { encodeId } from '@/libs/server/sqids';

const emailSender = new EmailSender();
export async function POST(request: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;

	const data = await request.formData();
	const file = data.get('file');
	const planId = data.get('planId');

	if (!file || !(file instanceof Blob)) {
		return NextResponse.json({ status: 'fail', message: 'No file uploaded' }, { status: 400 });
	}



	// Example: Looping over each record
	const location = await db.query.locations.findFirst({
		where: (locations, { eq }) => eq(locations.id, params.id),
	});

	if (!location) {
		return NextResponse.json({ status: 'fail', message: 'Location not found' }, { status: 404 });
	}

	try {

		const arrayBuffer = await file.arrayBuffer();
		const content = new TextDecoder('utf-8').decode(arrayBuffer);

		const rows = content.trim().split('\n');
		const headers = rows[0].split(',').map(h => h.trim());

		const records = rows.slice(1).map(row => {
			const values = row.split(',').map(v => v.trim());
			return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
		});
		const membersToInsert = records.map(record => ({
			firstName: record.fn,
			lastName: record.ln,
			email: record.email,
			phone: record.phone,
			lastRenewalDay: record.renewal,
			planId: planId ? Number(planId) : null,
			locationId: params.id
		}));

		await db.insert(importMembers).values(membersToInsert);

		await Promise.all(records.map(record => {
			const subject = `You've been invited to join ${location?.name} on Monstro`;
			return emailSender.send({
				options: {
					to: record.email,
					subject,
				},
				template: 'MemberInvite',
				data: {
					location: {
						name: location?.name
					},
					member: {
						firstName: record.first_name
					},
					ui: {
						btnText: "Accept Invite",
						btnUrl: `https://m.monstro-x.com/invite/${encodeId(params.id)}?email=${record.email}`
					},
					monstro: MonstroData
				}
			});
		}));
		return NextResponse.json({ sample: records.slice(0, 3) }, { status: 200 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ status: 500 });
	}
}

