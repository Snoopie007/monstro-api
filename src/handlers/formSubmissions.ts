import { HighLevel } from "@gohighlevel/api-client";

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

export type GhlFormCredentials = {
  privateIntegrationToken: string;
  locationId: string;
};

export async function submitGhlFormContact(
  credentials: GhlFormCredentials,
  contact: FormContact,
): Promise<void> {
  const ghl = new HighLevel({
    privateIntegrationToken: credentials.privateIntegrationToken,
  });
  await ghl.contacts.upsertContact({
    ...contact,
    locationId: credentials.locationId,
  });
}
