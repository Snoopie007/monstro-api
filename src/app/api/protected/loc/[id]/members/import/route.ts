import { db } from "@/db/db";
import { migrateMembers } from "@/db/schemas/MigrateMembers";
import { memberFields } from "@/db/schemas/members";
import { NextResponse } from "next/server";
import { sendEmailViaApi } from "@/libs/server/emails";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import Papa from "papaparse";
import type { CustomFieldType } from "@/types/member";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params

    const data = await request.formData()
    const file = data.get('file')
    const pricingId = data.get('pricingId')
    const planType = data.get('planType') as 'recurring' | 'one-time' | null
    const fieldMapping = JSON.parse(data.get('fieldMapping') as string)
    const requirePayment = data.get('requirePayment') === 'true'

    // Parse custom field data
    const customFieldMappingRaw = data.get('customFieldMapping')
    const customFieldMapping: Record<string, string> = customFieldMappingRaw
        ? JSON.parse(customFieldMappingRaw as string)
        : {}

    const newCustomFieldsRaw = data.get('newCustomFields')
    const newCustomFields: Array<{ csvColumn: string; fieldName: string; fieldType: string }> =
        newCustomFieldsRaw ? JSON.parse(newCustomFieldsRaw as string) : []

    if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
            { status: 'fail', message: 'No file uploaded' },
            { status: 400 }
        )
    }

    // Example: Looping over each record
    const location = await db.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, params.id),
    })

    if (!location) {
        return NextResponse.json(
            { status: 'fail', message: 'Location not found' },
            { status: 404 }
        )
    }

    try {
        // Create new custom fields and map csvColumn -> fieldId
        const newFieldIdMap: Record<string, string> = {}

        for (const field of newCustomFields) {
            const [created] = await db.insert(memberFields).values({
                name: field.fieldName,
                type: field.fieldType as CustomFieldType,
                locationId: params.id,
            }).returning()

            newFieldIdMap[field.csvColumn] = created.id
        }

        // Merge all mappings: { fieldId: csvColumnName }
        const allFieldMappings: Record<string, string> = {
            ...customFieldMapping,
            ...Object.fromEntries(
                Object.entries(newFieldIdMap).map(([csvCol, fieldId]) => [fieldId, csvCol])
            ),
        }

        const arrayBuffer = await file.arrayBuffer()
        const content = new TextDecoder('utf-8').decode(arrayBuffer)

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

			// Build custom field values for this record
			const customFieldValues: Array<{ fieldId: string; value: string }> = []

			for (const [fieldId, csvColumn] of Object.entries(allFieldMappings)) {
				const value = record[csvColumn]
				if (value !== undefined && value !== null && value !== '') {
					customFieldValues.push({ fieldId, value: String(value) })
				}
			}

			insertMembers.push({
				firstName,
				lastName,
				email,
				phone: formattedPhone.number,
				lastRenewalDay,
				pricingId: pricingId ? pricingId.toString() : null,
				planType: planType || null,
				locationId: params.id,
				metadata: { customFieldValues },
			});
		}

		if (insertMembers.length === 0) {
			return NextResponse.json(
				{ message: "No valid members to insert. Please check the format of the file and try again." },
				{ status: 400 }
			);
		}

		const [{ id }] = await db.insert(migrateMembers).values(insertMembers).returning({ id: migrateMembers.id });

		await Promise.all(
			insertMembers.map((m) => {
				const subject = `You've been invited to join ${location.name} on Monstro`;
				return sendEmailViaApi({
					recipient: m.email,
					template: "MemberInviteEmail",
					subject,
					data: {
						location: {
							name: location.name,
						},
						member: m,
						ui: {
							btnText: "Accept Invite",
							btnUrl: `https://m.monstro-x.com/register?migrateId=${id}`,
						}
					}
				});
			})
		);

        return NextResponse.json(
            { sample: records.slice(0, 3) },
            { status: 200 }
        )
    } catch (error) {
        console.error(error)
        return NextResponse.json({ status: 500 })
    }
}
