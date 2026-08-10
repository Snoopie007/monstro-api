import { expect, mock, test } from "bun:test";

const upsertContact = mock(async () => ({}));
const findFirst = mock(async () => ({
  apiKey: "private-token",
  accountId: "ghl-location",
}));
let highLevelOptions: unknown;

mock.module("@gohighlevel/api-client", () => ({
  HighLevel: class {
    constructor(options: unknown) {
      highLevelOptions = options;
    }
    contacts = { upsertContact };
  },
}));
mock.module("@/db/db", () => ({
  db: { query: { integrations: { findFirst } } },
}));

const { submitGhlFormContact } = await import("./formSubmissions");

test("uses the location GHL private token and preserves the full upsert payload", async () => {
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

  await submitGhlFormContact("monstro-location", contact);

  expect(findFirst).toHaveBeenCalledTimes(1);
  expect(highLevelOptions).toEqual({ privateIntegrationToken: "private-token" });
  expect(upsertContact).toHaveBeenCalledWith({
    ...contact,
    locationId: "ghl-location",
  });
});
