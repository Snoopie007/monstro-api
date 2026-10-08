import { expect, mock, test } from "bun:test";

const upsertContact = mock(async () => ({}));
let highLevelOptions: unknown;

mock.module("@gohighlevel/api-client", () => ({
  HighLevel: class {
    constructor(options: unknown) {
      highLevelOptions = options;
    }
    contacts = { upsertContact };
  },
}));

const { submitGhlFormContact } = await import("./formSubmissions");

test("uses the site settings GHL credentials and preserves the full upsert payload", async () => {
  const contact = {
    firstName: "Jane",
    lastName: "Smith",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "5555555555",
    source: "Generated website form" as const,
    tags: ["new lead", "web contact form", "website"],
    customFields: [{ key: "program", field_value: "kids" }],
  };

  await submitGhlFormContact({
    privateIntegrationToken: "private-token",
    locationId: "ghl-location",
  }, contact);

  expect(highLevelOptions).toEqual({ privateIntegrationToken: "private-token" });
  expect(upsertContact).toHaveBeenCalledWith({
    ...contact,
    locationId: "ghl-location",
  });
});
