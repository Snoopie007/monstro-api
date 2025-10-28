import { db } from "@/db/db";
import { importMembers } from "@/db/schemas/ImportMembers";
import { NextResponse } from "next/server";
import { EmailSender } from "@/libs/server/emails";
import { MonstroData } from "@/libs/data";
import { parsePhoneNumberFromString } from "libphonenumber-js";
const emailSender = new EmailSender();
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

		const rows = content.trim().split("\n");
		const headers = rows[0].split(",").map((h) => h.trim());

		const records = rows.slice(1).map((row) => {
			const values = row.split(",").map((v) => v.trim());
			return Object.fromEntries(
				headers.map((header, index) => [header, values[index]])
			);
		});

		const insertMembers = [];
		for (const record of records) {
			const formattedPhone = parsePhoneNumberFromString(
				record[fieldMapping.phone],
				"US"
			);
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const email = record[fieldMapping.email];
			const lastRenewalDate = record[fieldMapping.lastRenewalDate];

			if (!formattedPhone || !formattedPhone.isValid()) {
				continue;
			}

			if (!emailRegex.test(email)) {
				continue;
			}

			if (!DATE_FORMAT_REGEX.test(lastRenewalDate)) {
				continue;
			}

			insertMembers.push({
				firstName: record[fieldMapping.firstName],
				lastName: record[fieldMapping.lastName],
				email: email,
				phone: formattedPhone.number,
				lastRenewalDay: new Date(lastRenewalDate),
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
				return emailSender.send({
					options: {
						to: m.email,
						subject,
					},
					template: "MemberInvite",
					data: {
						location: {
							name: location.name,
						},
						member: m,
						ui: {
							btnText: "Accept Invite",
							btnUrl: `https://m.monstro-x.com/invite/import/${id}`,
						},
						monstro: MonstroData,
					},
				});
			})
		);

		return NextResponse.json({ sample: records.slice(0, 3) }, { status: 200 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ status: 500 });
	}
}
