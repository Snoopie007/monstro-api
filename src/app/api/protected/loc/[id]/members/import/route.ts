import { db } from "@/db/db";
import { importMembers } from "@/db/schemas/ImportMembers";
import { NextResponse } from "next/server";
import { sendEmailViaApi } from "@/libs/server/emails";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import Papa from "papaparse";

export async function POST(
	request: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;

	const data = await request.formData();
	const file = data.get("file");
	const planId = data.get("planId");
	const fieldMapping = JSON.parse(data.get("fieldMapping") as string);

	if (!file || !(file instanceof Blob)) {
		return NextResponse.json(
			{ status: "fail", message: "No file uploaded" },
			{ status: 400 }
		);
	}

	// Example: Looping over each record
	const location = await db.query.locations.findFirst({
		where: (locations, { eq }) => eq(locations.id, params.id),
	});

	if (!location) {
		return NextResponse.json(
			{ status: "fail", message: "Location not found" },
			{ status: 404 }
		);
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const content = new TextDecoder("utf-8").decode(arrayBuffer);

		const { data: records } = Papa.parse<Record<string, string>>(content.trim(), {
			header: true,
			skipEmptyLines: true,
		});

		const insertMembers = [];
		for (const record of records) {
			const firstName = record[fieldMapping.firstName];
			const lastName = record[fieldMapping.lastName];
			const email = record[fieldMapping.email];
			const phone = record[fieldMapping.phone];
			const lastRenewalDate = record[fieldMapping.lastRenewalDate];

			if (!email) continue;
			const formattedPhone = parsePhoneNumberFromString(phone, "US");
			
			if (!formattedPhone) continue;

			// Validate the date before creating a Date object
			if (!lastRenewalDate) {
				console.warn(`Skipping ${email}: missing renewal date`);
				continue;
			}
			
			const lastRenewalDay = new Date(lastRenewalDate);
			if (isNaN(lastRenewalDay.getTime())) {
				console.warn(`Skipping ${email}: invalid date "${lastRenewalDate}"`);
				continue;
			}

			insertMembers.push({
				firstName,
				lastName,
				email,
				phone: formattedPhone.number,
				lastRenewalDay,
				planId: planId ? planId.toString() : null,
				locationId: params.id,
			});
		}

		if (insertMembers.length === 0) {
			return NextResponse.json(
				{ message: "No valid members to insert. Please check the format of the file and try again." },
				{ status: 400 }
			);
		}

		const [{ id }] = await db.insert(importMembers).values(insertMembers).returning({ id: importMembers.id });

		await Promise.all(
			insertMembers.map((m) => {
				const subject = `You've been invited to join ${location.name} on Monstro`;
				return sendEmailViaApi({
					recipient: m.email,
					template: "MemberInvite",
					subject,
					data: {
						location: {
							name: location.name,
						},
						member: m,
						ui: {
							btnText: "Accept Invite",
							btnUrl: `https://m.monstro-x.com/invite/import/${id}`,
						}
					}
				});
			})
		);

		return NextResponse.json({ sample: records.slice(0, 3) }, { status: 200 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ status: 500 });
	}
}
