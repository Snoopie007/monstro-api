import { db } from "@/db/db";
import { CustomFieldsList, NewCF } from "./components";
import { MemberField } from "@/types";
import { CFProvider } from "./provider";
async function getCustomFields(locationId: string): Promise<MemberField[]> {
	try {
		const customFields = await db.query.memberFields.findMany({
			where: (field, { eq }) => eq(field.locationId, locationId),
			orderBy: (field, { asc }) => [asc(field.created)],
		});

		return customFields;
	} catch (error) {
		console.error("Error fetching initial custom fields:", error);
		return [];
	}
}

type CustomFieldsPageProps = {
	params: Promise<{ id: string }>;
}

export default async function CustomFieldsPage(props: CustomFieldsPageProps) {
	const { id } = await props.params;
	const initialFields = await getCustomFields(id);

	return (
		<CFProvider initialFields={initialFields}>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<div className="space-y-1">
						<div className='text-xl font-semibold mb-1'>Custom Fields</div>
						<p className='text-sm'>Create and manage custom fields for your members</p>
					</div>
					<NewCF lid={id} />
				</div>
				<CustomFieldsList lid={id} />
			</div>
		</CFProvider>
	);
}
