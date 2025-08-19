import { db } from "@/db/db";
import CustomFieldsPageClient from "./ClientComponent";
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

  return <CustomFieldsPageClient initialFields={initialFields} />;
}
