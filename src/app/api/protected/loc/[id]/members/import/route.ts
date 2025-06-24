import { db } from '@/db/db';
import { importMembers } from '@/db/schemas/ImportMembers';
import { NextResponse } from 'next/server';
import { EmailSender } from "@/libs/server/emails";
import { MonstroData } from '@/libs/data';
import { encodeId } from '@/libs/server/sqids';

const emailSender = new EmailSender();
export async function POST(request: Request, props: { params: Promise<{ id: number }> }) {

	const data = await request.formData();
	const file = data.get('file');
	const planId = data.get('planId');

	const params = await props.params;
	if (!file) {
		return NextResponse.json({ status: 'fail', message: 'No file uploaded' }, { status: 400 });
	}
	if (file && file instanceof Blob) {
		try {

			// Read file content
			const arrayBuffer = await file.arrayBuffer();
			const content = new TextDecoder('utf-8').decode(arrayBuffer);

			// Split content into rows and extract headers
			const rows = content.trim().split('\n');
			const headers = rows[0].split(',').map(h => h.trim());

			// Loop through records and map values to headers
			const records = rows.slice(1).map(row => {
				const values = row.split(',').map(v => v.trim());
				return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
			});
			const addedRecords = [];
			// Example: Looping over each record
			const location = await db.query.locations.findFirst({
				where: (locations, { eq }) => eq(locations.id, params.id),
			});

			if (location) {
				for (const record of records) {
					try {
						const inserted = await db.insert(importMembers).values({
							firstName: record.first_name,
							lastName: record.last_name,
							email: record.email,
							phone: record.phone,
							lastRenewalDay: record.last_renewal_day,
							planId: planId && typeof planId === 'string' ? parseInt(planId, 10) : null,
							locationId: params.id
						});

						addedRecords.push(inserted);
						const subject = `You've been invited to join ${location?.name} on Monstro`;
						await emailSender.send({
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


					} catch (error) {
						console.error(`Error inserting record: ${record.email}`, error);
					}
				}

			}
			return NextResponse.json({ sample: records.slice(0, 3) }, { status: 200 });
		} catch (error) {
			console.error(error);
			return NextResponse.json({ status: 500 });
		}
	}
}
