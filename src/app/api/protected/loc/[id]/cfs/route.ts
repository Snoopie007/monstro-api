import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and, inArray } from "drizzle-orm";
import { memberFields, locations } from "@/db/schemas";

// export async function GET(
//   req: Request,
//   props: { params: Promise<{ id: string }> }
// ) {
//   const params = await props.params;
//   const locationId = params.id;

//   try {
//     const session = await auth();
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Simple authorization check - just verify location exists
//     // TODO: Add proper user-location access control when available
//     const location = await db.query.locations.findFirst({
//       where: (location, { eq }) => eq(location.id, locationId),
//     });

//     if (!location) {
//       return NextResponse.json(
//         { error: "Location not found" },
//         { status: 404 }
//       );
//     }

//     // Fetch custom fields for this location
//     const customFields = await db.query.memberFields.findMany({
//       where: (field, { eq }) => eq(field.locationId, locationId),
//       orderBy: (field, { asc }) => [asc(field.created)],
//     });

//     // Transform data for frontend consumption
//     const transformedFields = customFields.map((field) => ({
//       id: field.id,
//       name: field.name,
//       type: field.type,
//       placeholder: field.placeholder || "",
//       helpText: field.helpText || "",
//       options: field.options || [],
//       created: field.created,
//       updated: field.updated,
//     }));

//     return NextResponse.json({
//       success: true,
//       data: transformedFields,
//       meta: {
//         total: transformedFields.length,
//         locationId: locationId,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching custom fields:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to fetch custom fields",
//         message: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }

export async function POST(
	req: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const locationId = params.id;

	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Simple authorization check - just verify location exists
		// TODO: Add proper user-location access control when available
		const location = await db.query.locations.findFirst({
			where: (location, { eq }) => eq(location.id, locationId),
		});

		if (!location) {
			return NextResponse.json(
				{ error: "Location not found" },
				{ status: 404 }
			);
		}

		const body = await req.json();
		const { fields } = body;

		// Validate that fields array exists (can be empty for clearing all fields)
		if (!fields || !Array.isArray(fields)) {
			return NextResponse.json(
				{
					error: "Invalid request",
					message: "Fields array is required",
				},
				{ status: 400 }
			);
		}

		// Validate each field
		const validTypes = [
			"text",
			"number",
			"date",
			"boolean",
			"select",
			"multi-select",
		];

		for (const [index, field] of fields.entries()) {
			const { name, type } = field;

			// Validate required fields
			if (!name || !type) {
				return NextResponse.json(
					{
						error: "Missing required fields",
						message: `Field at index ${index}: Name and type are required`,
					},
					{ status: 400 }
				);
			}

			// Validate field type
			if (!validTypes.includes(type)) {
				return NextResponse.json(
					{
						error: "Invalid field type",
						message: `Field at index ${index}: Type must be one of: ${validTypes.join(
							", "
						)}`,
					},
					{ status: 400 }
				);
			}
		}

		// Fetch all existing fields for this location
		const existingFields = await db.query.memberFields.findMany({
			where: (field, { eq }) => eq(field.locationId, locationId),
		});

		// Separate fields into those with IDs (existing) and those without (new)
		const fieldsWithIds = fields.filter((field) => field.id);
		const fieldsWithoutIds = fields.filter((field) => !field.id);

		// Get IDs of existing fields that should remain
		const submittedExistingIds = fieldsWithIds.map((field) => field.id);
		const existingFieldIds = existingFields.map((field) => field.id);

		// Determine what to delete (existing fields not in submitted array)
		const fieldsToDelete = existingFieldIds.filter(
			(id) => !submittedExistingIds.includes(id)
		);

		// Determine what to update (submitted fields with IDs)
		const fieldsToUpdate = fieldsWithIds.map((field) => ({
			id: field.id,
			name: field.name.trim(),
			type: field.type,
			placeholder: field.placeholder || null,
			helpText: field.helpText || null,
			options: field.options || [],
		}));

		// Determine what to create (submitted fields without IDs)
		const fieldsToCreate = fieldsWithoutIds.map((field) => ({
			name: field.name.trim(),
			type: field.type as
				| "text"
				| "number"
				| "date"
				| "boolean"
				| "select"
				| "multi-select",
			locationId: locationId,
			placeholder: field.placeholder || null,
			helpText: field.helpText || null,
			options: field.options || [],
		}));

		// Check for duplicate names within submitted fields
		const fieldNames = fields.map((f) => f.name.toLowerCase().trim());
		const duplicateNames = fieldNames.filter(
			(name, index) => fieldNames.indexOf(name) !== index
		);

		if (duplicateNames.length > 0) {
			return NextResponse.json(
				{
					error: "Duplicate field names",
					message: `Duplicate field names found: ${[
						...new Set(duplicateNames),
					].join(", ")}`,
				},
				{ status: 400 }
			);
		}

		// Perform all operations in a single transaction
		const result = await db.transaction(async (tx) => {
			const operationResults: {
				created: any[];
				updated: any[];
				deleted: any[];
			} = {
				created: [],
				updated: [],
				deleted: [],
			};

			// Delete fields that are no longer needed
			if (fieldsToDelete.length > 0) {
				operationResults.deleted = await tx
					.delete(memberFields)
					.where(
						and(
							eq(memberFields.locationId, locationId),
							inArray(memberFields.id, fieldsToDelete)
						)
					)
					.returning();
			}

			// Update existing fields
			for (const field of fieldsToUpdate) {
				const [updatedField] = await tx
					.update(memberFields)
					.set({
						name: field.name,
						type: field.type,
						placeholder: field.placeholder,
						helpText: field.helpText,
						options: field.options,
						updated: new Date(),
					})
					.where(eq(memberFields.id, field.id))
					.returning();

				if (updatedField) {
					operationResults.updated.push(updatedField);
				}
			}

			// Create new fields
			if (fieldsToCreate.length > 0) {
				operationResults.created = await tx
					.insert(memberFields)
					.values(fieldsToCreate)
					.returning();
			}

			return operationResults;
		});

		// Transform all fields for frontend response
		const allFields = [...result.updated, ...result.created].map((field) => ({
			id: field.id,
			name: field.name,
			type: field.type,
			placeholder: field.placeholder || "",
			helpText: field.helpText || "",
			options: field.options || [],
			created: field.created,
			updated: field.updated,
		}));

		return NextResponse.json({
			success: true,
			data: allFields,
			message: `Fields synchronized successfully`,
			summary: {
				total: fields.length,
				created: result.created.length,
				updated: result.updated.length,
				deleted: result.deleted.length,
			},
		});
	} catch (error) {
		console.error("Error syncing custom fields:", error);
		return NextResponse.json(
			{
				error: "Failed to sync custom fields",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}


export async function DELETE(
	req: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const locationId = params.id;

	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}