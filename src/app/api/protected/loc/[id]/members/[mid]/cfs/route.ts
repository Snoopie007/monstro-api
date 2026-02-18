import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { memberFields, memberCustomFields, members } from "@subtrees/schemas";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const { id: locationId, mid: memberId } = params;

	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Verify member exists and belongs to location
		const member = await db.query.members.findFirst({
			where: (member, { eq }) => eq(member.id, memberId),
			with: {
				memberLocations: {
					where: (ml, { eq }) => eq(ml.locationId, locationId),
				},
			},
		});

		if (!member || !member.memberLocations?.length) {
			return NextResponse.json(
				{ error: "Member not found or doesn't belong to this location" },
				{ status: 404 }
			);
		}

		// Get all custom fields for this location
		const customFields = await db.query.memberFields.findMany({
			where: (field, { eq }) => eq(field.locationId, locationId),
			orderBy: (field, { asc }) => [asc(field.created)],
		});

		// Get member's custom field values
		const memberCustomFieldValues = await db.query.memberCustomFields.findMany({
			where: (mcf, { eq }) => eq(mcf.memberId, memberId),
			with: {
				field: true,
			},
		});

		// Create a map of field values
		const valueMap = new Map(
			memberCustomFieldValues.map((mcf) => [mcf.customFieldId, mcf.value])
		);

		// Combine field definitions with values
		const fieldsWithValues = customFields.map((field) => ({
			id: field.id,
			name: field.name,
			type: field.type,
			placeholder: field.placeholder || "",
			helpText: field.helpText || "",
			options: field.options || [],
			value: valueMap.get(field.id) || "",
			created: field.created,
			updated: field.updated,
		}));

		return NextResponse.json({
			success: true,
			data: fieldsWithValues,
			meta: {
				total: fieldsWithValues.length,
				memberId,
				locationId,
			},
		});
	} catch (error) {
		console.error("Error fetching member custom fields:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch member custom fields",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const { id: locationId, mid: memberId } = params;

	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Verify member exists and belongs to location
		const member = await db.query.members.findFirst({
			where: (member, { eq }) => eq(member.id, memberId),
			with: {
				memberLocations: {
					where: (ml, { eq }) => eq(ml.locationId, locationId),
				},
			},
		});

		if (!member || !member.memberLocations?.length) {
			return NextResponse.json(
				{ error: "Member not found or doesn't belong to this location" },
				{ status: 404 }
			);
		}

		const body = await req.json();
		const { customFields } = body;

		// Validate that customFields is an array
		if (!customFields || !Array.isArray(customFields)) {
			return NextResponse.json(
				{
					error: "Invalid request",
					message: "customFields array is required",
				},
				{ status: 400 }
			);
		}

		// Validate each custom field entry
		for (const [index, cf] of customFields.entries()) {
			if (!cf.fieldId || typeof cf.value !== "string") {
				return NextResponse.json(
					{
						error: "Invalid custom field data",
						message: `Field at index ${index}: fieldId and value are required`,
					},
					{ status: 400 }
				);
			}
		}

		// Get field IDs to verify they exist and belong to this location
		const fieldIds = customFields.map((cf) => cf.fieldId);
		const existingFields = await db.query.memberFields.findMany({
			where: (field, { eq, and, inArray }) =>
				and(eq(field.locationId, locationId), inArray(field.id, fieldIds)),
		});

		const existingFieldIds = existingFields.map((field) => field.id);
		const invalidFieldIds = fieldIds.filter(
			(id) => !existingFieldIds.includes(id)
		);

		if (invalidFieldIds.length > 0) {
			return NextResponse.json(
				{
					error: "Invalid field IDs",
					message: `The following field IDs don't exist or don't belong to this location: ${invalidFieldIds.join(
						", "
					)}`,
				},
				{ status: 400 }
			);
		}

		// Perform upsert operations in a transaction
		const result = await db.transaction(async (tx) => {
			const operations: {
				created: (typeof memberCustomFields.$inferSelect)[];
				updated: (typeof memberCustomFields.$inferSelect)[];
			} = {
				created: [],
				updated: [],
			};

			for (const cf of customFields) {
				// Check if this member-field combination already exists
				const existing = await tx.query.memberCustomFields.findFirst({
					where: (mcf, { eq, and }) =>
						and(eq(mcf.memberId, memberId), eq(mcf.customFieldId, cf.fieldId)),
				});

				if (existing) {
					// Update existing value
					const [updated] = await tx
						.update(memberCustomFields)
						.set({
							value: cf.value,
							updated: new Date(),
						})
						.where(
							and(
								eq(memberCustomFields.memberId, memberId),
								eq(memberCustomFields.customFieldId, cf.fieldId)
							)
						)
						.returning();

					if (updated) {
						operations.updated.push(updated);
					}
				} else {
					// Create new value
					const [created] = await tx
						.insert(memberCustomFields)
						.values({
							memberId,
							customFieldId: cf.fieldId,
							value: cf.value,
						})
						.returning();

					if (created) {
						operations.created.push(created);
					}
				}
			}

			return operations;
		});

		return NextResponse.json({
			success: true,
			message: "Member custom fields updated successfully",
			summary: {
				created: result.created.length,
				updated: result.updated.length,
				total: customFields.length,
			},
		});
	} catch (error) {
		console.error("Error updating member custom fields:", error);
		return NextResponse.json(
			{
				error: "Failed to update member custom fields",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const { id: locationId, mid: memberId } = params;

	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();
		const { fieldIds } = body;

		// Validate fieldIds array
		if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
			return NextResponse.json(
				{
					error: "Invalid request",
					message: "fieldIds array is required and must not be empty",
				},
				{ status: 400 }
			);
		}

		// Delete the specified custom field values for this member
		const deletedFields = await db
			.delete(memberCustomFields)
			.where(
				and(
					eq(memberCustomFields.memberId, memberId),
					inArray(memberCustomFields.customFieldId, fieldIds)
				)
			)
			.returning();

		return NextResponse.json({
			success: true,
			data: deletedFields,
			message: `${deletedFields.length} custom field value(s) deleted successfully`,
			summary: {
				requested: fieldIds.length,
				deleted: deletedFields.length,
			},
		});
	} catch (error) {
		console.error("Error deleting member custom fields:", error);
		return NextResponse.json(
			{
				error: "Failed to delete member custom fields",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
