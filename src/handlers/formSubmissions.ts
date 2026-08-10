import { HighLevel } from "@gohighlevel/api-client";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { integrations } from "@subtrees/schemas";

export type FormContact = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  source: "Generated website form";
  tags: string[];
  customFields: Array<{ key: string; field_value: string }>;
};

export async function submitGhlFormContact(locationId: string, contact: FormContact): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.locationId, locationId),
      eq(integrations.service, "gl"),
    ),
  });
  if (!integration?.apiKey || !integration.accountId) {
    throw new Error("GHL integration is not configured");
  }
  const ghl = new HighLevel({ privateIntegrationToken: integration.apiKey });
  await ghl.contacts.upsertContact({
    ...contact,
    locationId: integration.accountId,
  });
}
