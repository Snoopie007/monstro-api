import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let rows: unknown[][] = [];
let inserted: Record<string, unknown> | null = null;
let returningRows: unknown[][] = [];
const updates: Record<string, unknown>[] = [];

function selectChain() {
  const chain = {
    from() { return chain; },
    where() { return chain; },
    orderBy() { return chain; },
    limit() { return chain; },
    for: async () => rows.shift() ?? [],
    then(resolve: (value: unknown[]) => void) { resolve(rows.shift() ?? []); },
  };
  return chain;
}

const tx = {
  select: mock(() => selectChain()),
  update: mock(() => ({
    set(value: Record<string, unknown>) {
      updates.push(value);
      return { where: async () => [] };
    },
  })),
  insert: mock(() => ({
    values(value: Record<string, unknown>) {
      inserted = value;
      return { returning: async () => returningRows.shift() ?? [{ id: "rev-2" }] };
    },
  })),
};
const db = {
  select: tx.select,
  transaction: mock(async (callback: (value: typeof tx) => unknown) => callback(tx)),
};

mock.module("@/db/db", () => ({ db }));
Bun.env.MONSTRO_SITES_SERVICE_TOKEN = "sites-secret";
const { sharedSiteAdminRoutes } = await import("./sharedSites");
const app = new Elysia().use(sharedSiteAdminRoutes);

const site = {
  id: "site-1",
  slug: "academy",
  plan: "scale",
  status: "active",
  publishedRevisionId: "rev-1",
};
const revision = {
  id: "rev-1",
  schemaVersion: 1,
  config: { schemaVersion: 1 },
  createdAt: new Date("2026-08-08T12:00:00.000Z"),
};

function request(path: string, init?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      Authorization: "Bearer sites-secret",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  }));
}

beforeEach(() => {
  rows = [];
  inserted = null;
  returningRows = [];
  updates.length = 0;
  tx.select.mockClear();
  tx.update.mockClear();
  tx.insert.mockClear();
});

test("requires service authentication", async () => {
  const response = await app.handle(new Request("http://localhost/shared-sites/site-1/editor"));
  expect(response.status).toBe(401);
});

test("creates the first shared-site draft", async () => {
  const createdSite = { ...site, id: "site-created", status: "draft", publishedRevisionId: null };
  const createdRevision = { ...revision, id: "rev-created" };
  rows = [
    [{ id: "location-1", vendorId: "vendor-1" }],
    [],
    [createdSite],
    [createdRevision],
    [],
  ];
  returningRows = [[{ id: "site-created" }]];
  const response = await request("/shared-sites", {
    method: "POST",
    body: JSON.stringify({
      locationId: "location-1",
      slug: "academy",
      plan: "scale",
      schemaVersion: 1,
      config: { schemaVersion: 1 },
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    siteId: "site-created",
    revisionId: "rev-created",
    hasDraft: true,
  });
});

test("reads the published revision when no draft exists", async () => {
  rows = [[site], [], [revision], [{ hostname: "academy.example.com" }]];
  const response = await request("/shared-sites/site-1/editor");

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    revisionId: "rev-1",
    publishedRevisionId: "rev-1",
    hasDraft: false,
    domain: "academy.example.com",
  });
});

test("rejects a stale draft save", async () => {
  rows = [[site], [{ id: "rev-newer" }]];
  const response = await request("/shared-sites/site-1/draft", {
    method: "PUT",
    body: JSON.stringify({
      expectedRevisionId: "rev-1",
      schemaVersion: 1,
      config: { schemaVersion: 1 },
    }),
  });

  expect(response.status).toBe(409);
  expect(inserted).toBeNull();
});

test("publishes only the expected draft", async () => {
  rows = [[site], [{ id: "rev-2" }], [{ hostname: "academy.example.com" }]];
  const response = await request("/shared-sites/site-1/publish", {
    method: "POST",
    body: JSON.stringify({ expectedRevisionId: "rev-2" }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    siteId: "site-1",
    publishedRevisionId: "rev-2",
    domains: ["academy.example.com"],
  });
  expect(updates).toContainEqual(expect.objectContaining({ status: "published" }));
  expect(updates).toContainEqual(expect.objectContaining({ status: "active", publishedRevisionId: "rev-2" }));
});

test("retries an already completed publish idempotently", async () => {
  rows = [[{ ...site, publishedRevisionId: "rev-2" }], [], [{ hostname: "academy.example.com" }]];
  const response = await request("/shared-sites/site-1/publish", {
    method: "POST",
    body: JSON.stringify({ expectedRevisionId: "rev-2" }),
  });

  expect(response.status).toBe(200);
  expect(updates).toHaveLength(0);
});
