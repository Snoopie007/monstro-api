import { db } from "@/db/db";
import { CustomFieldsList } from "./components";
import type { CustomFieldFormData } from "./schemas";

async function getCustomFields(
	locationId: string
): Promise<CustomFieldFormData[]> {
	try {
		const customFields = await db.query.memberFields.findMany({
			where: (field, { eq }) => eq(field.locationId, locationId),
			orderBy: (field, { asc }) => [asc(field.created)],
		});

		return customFields.map((field) => ({
			id: field.id,
			name: field.name,
			type: field.type,
			placeholder: field.placeholder || "",
			helpText: field.helpText || "",
			options: field.options || [],
		}));
	} catch (error) {
		console.error("Error fetching initial custom fields:", error);
		return [];
	}
}

export default async function CustomFieldsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const initialFields = await getCustomFields(params.id);

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<div className='text-xl font-semibold mb-1'>Custom Fields</div>
				<p className='text-sm'>Create and manage custom fields for your members</p>
			</div>
			<CustomFieldsList lid={params.id} initialFields={initialFields} />
		</div>
	);
}
