import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let rows: unknown[][] = [];
let inserted: unknown = null;
const inserts: unknown[] = [];
let returningRows: unknown[][] = [];
const updates: Record<string, unknown>[] = [];
let vercelResponses: Response[] = [];
const originalFetch = globalThis.fetch;
const vercelFetch = mock(async () => {
  const response = vercelResponses.shift();
  if (!response) throw new Error("Unexpected Vercel request");
  return response;
});

function selectChain() {
  const chain = {
    from() { return chain; },
    leftJoin() { return chain; },
    innerJoin() { return chain; },
    where() { return chain; },
    orderBy() { return chain; },
    limit() { return chain; },
    for: async () => rows.shift() ?? [],
    then(resolve: (value: unknown[]) => void) { resolve(rows.shift() ?? []); },
  };
  return chain;
}

function mutationChain() {
  const chain = {
    where: async () => [],
    onConflictDoUpdate() { return chain; },
    returning: async () => returningRows.shift() ?? [{ id: "rev-2" }],
    then(resolve: (value: unknown[]) => void) { resolve([]); },
  };
  return chain;
}

const tx = {
  execute: mock(async () => []),
  select: mock(() => selectChain()),
  delete: mock(() => mutationChain()),
  update: mock(() => ({
    set(value: Record<string, unknown>) {
      updates.push(value);
      return mutationChain();
    },
  })),
  insert: mock(() => ({
    values(value: unknown) {
      inserted = value;
      inserts.push(value);
      return mutationChain();
    },
  })),
};
const db = {
  select: tx.select,
  insert: tx.insert,
  update: tx.update,
  transaction: mock(async (callback: (value: typeof tx) => unknown) => callback(tx)),
};

mock.module("@/db/db", () => ({ db }));
Bun.env.MONSTRO_SITES_SERVICE_TOKEN = "sites-secret";
Bun.env.VERCEL_TOKEN = "vercel-secret";
Bun.env.VERCEL_SITES_PROJECT_ID = "sites-project";
delete Bun.env.VERCEL_TEAM_ID;
globalThis.fetch = vercelFetch as unknown as typeof fetch;
const { sharedSiteAdminRoutes } = await import("./sharedSites");
const app = new Elysia().use(sharedSiteAdminRoutes);

const site = {
  id: "site-1",
  slug: "academy",
  plan: "scale",
  locationId: "location-1",
  createdAt: new Date("2026-08-08T11:00:00.000Z"),
  status: "active",
  publishedRevisionId: "rev-1",
};
const templateConfig = {
  schemaVersion: 2,
  locale: "en-US",
  business: {
    name: "{{businessName}}",
    tagline: "Train well",
    structuredDataType: "LocalBusiness",
  },
  metadata: {
    defaultTitle: "{{businessName}}",
    titleTemplate: "%s",
    defaultDescription: "Train well",
  },
  theme: {
    colors: {
      primary: "#2563eb",
      background: "#ffffff",
      foreground: "#111827",
      muted: "#64748b",
      accent: "#dbeafe",
    },
    typography: { heading: "sans", body: "sans" },
    radius: "medium",
  },
  navigation: [],
  footer: { credit: "", links: [] },
  content: { programs: [], teams: [], testimonials: [], faqs: [] },
  pages: [{
    id: "home",
    path: "/",
    kind: "sections",
    visible: true,
    metadata: { title: "Home" },
    sections: [{
      id: "hero",
      type: "hero",
      visible: true,
      props: { title: "{{businessName}}", description: "Train well" },
    }],
  }],
  forms: [],
  capabilities: {
    blog: false,
    commerce: false,
    schedules: false,
    downloads: false,
    memberAuth: false,
  },
};
const settings = {
  ...Object.fromEntries(
    Object.entries(templateConfig)
      .filter(([key]) => key !== "schemaVersion" && key !== "pages"),
  ),
  business: { ...templateConfig.business, name: "Academy" },
};
const storedPage = {
  id: "page-home",
  pageKey: "home",
  path: "/",
  kind: "sections" as const,
  position: 0,
  visible: true,
  metadata: { title: "Home" },
  settings: {},
};
const storedBlock = {
  pageId: "page-home",
  blockKey: "hero",
  type: "hero",
  position: 0,
  visible: true,
  props: { title: "Academy", description: "Train well" },
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
  inserts.length = 0;
  returningRows = [];
  updates.length = 0;
  vercelResponses = [];
  tx.select.mockClear();
  tx.update.mockClear();
  tx.insert.mockClear();
  tx.execute.mockClear();
  tx.delete.mockClear();
  vercelFetch.mockClear();
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

test("lists only the latest active platform page template versions", async () => {
  const pageTemplate = {
    schemaVersion: 2,
    page: {
      metadata: { description: "Tour page" },
      sections: [{
        id: "intro",
        type: "rich_text",
        visible: true,
        props: { title: "Tour", body: ["Welcome"] },
      }],
    },
  };
  rows = [[
    {
      templateId: "page-tour",
      versionId: "page-tour-v2",
      versionNumber: 2,
      schemaVersion: 2,
      name: "Tour",
      description: "Latest",
      payload: pageTemplate,
    },
    {
      templateId: "page-tour",
      versionId: "page-tour-v1",
      versionNumber: 1,
      schemaVersion: 2,
      name: "Tour",
      description: "Old",
      payload: pageTemplate,
    },
    {
      templateId: "page-offer",
      versionId: "page-offer-v1",
      versionNumber: 1,
      schemaVersion: 2,
      name: "Offer",
      description: "Offer",
      payload: pageTemplate,
    },
  ]];

  const response = await request("/shared-sites/templates/pages");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    templates: [
      {
        templateId: "page-tour",
        versionId: "page-tour-v2",
        name: "Tour",
        description: "Latest",
      },
      {
        templateId: "page-offer",
        versionId: "page-offer-v1",
        name: "Offer",
        description: "Offer",
      },
    ],
  });
});


test("requires service authentication", async () => {
  const response = await app.handle(new Request("http://localhost/shared-sites/site-1/editor"));
  expect(response.status).toBe(401);
});

test("creates a relational draft from the active plan template", async () => {
  const createdSite = { ...site, id: "site-created", status: "draft", publishedRevisionId: null };
  rows = [
    [{ id: "location-1", vendorId: "vendor-1", city: "Austin" }],
    [],
    [{ versionId: "tplv-scale-1", payload: templateConfig }],
    [createdSite],
    [{
      schemaVersion: 2,
      settings,
      version: 1,
      isDirty: true,
      updatedAt: new Date("2026-08-08T12:00:00.000Z"),
    }],
    [storedPage],
    [storedBlock],
    [],
  ];
  returningRows = [
    [{ id: "site-created" }],
    [{ id: "page-home", pageKey: "home" }],
  ];
  const response = await request("/shared-sites", {
    method: "POST",
    body: JSON.stringify({
      locationId: "location-1",
      slug: "academy",
      plan: "scale",
      businessName: "Academy",
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    siteId: "site-created",
    revisionId: "draft:site-created:1",
    hasDraft: true,
    config: { business: { name: "Academy" } },
  });
});
test("creates one clean published baseline for a legacy migration", async () => {
  rows = [
    [{ id: "location-1", vendorId: "vendor-1" }],
    [],
    [],
  ];
  returningRows = [
    [{ id: "site-migrated" }],
    [{ id: "page-home", pageKey: "home" }],
    [{ id: "rev-migrated" }],
  ];
  const response = await request("/shared-sites/migrations", {
    method: "POST",
    headers: { "X-Monstro-Actor-Id": "admin-1" },
    body: JSON.stringify({
      sourceKey: "legacy-site:38",
      locationId: "location-1",
      slug: "academy",
      plan: "scale",
      config: {
        ...templateConfig,
        integrations: {
          ghl: {
            privateIntegrationToken: "pit-private",
            locationId: "ghl-location",
          },
        },
      },
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ siteId: "site-migrated", created: true });
  expect(inserts).toContainEqual(expect.objectContaining({ version: 1, isDirty: false }));
  expect(inserts).toContainEqual(expect.objectContaining({
    settings: expect.objectContaining({
      integrations: {
        ghl: {
          privateIntegrationToken: "pit-private",
          locationId: "ghl-location",
        },
      },
    }),
  }));
  expect(inserts).toContainEqual(expect.objectContaining({ revisionNumber: 1, status: "published" }));
  expect(updates).toContainEqual(expect.objectContaining({
    status: "active",
    publishedRevisionId: "rev-migrated",
  }));
  expect(inserts).not.toContainEqual(expect.objectContaining({ hostname: expect.any(String) }));
  expect(vercelFetch).not.toHaveBeenCalled();
});

test("reuses a migrated target without writing another baseline", async () => {
  rows = [
    [{ id: "location-1", vendorId: "vendor-1" }],
    [{
      id: "site-migrated",
      vendorId: "vendor-1",
      slug: "academy",
      plan: "scale",
      locationId: "location-1",
    }],
  ];
  const response = await request("/shared-sites/migrations", {
    method: "POST",
    body: JSON.stringify({
      sourceKey: "legacy-site:38",
      locationId: "location-1",
      slug: "academy",
      plan: "scale",
      config: {
        ...templateConfig,
        integrations: {
          ghl: {
            privateIntegrationToken: "pit-private",
            locationId: "ghl-location",
          },
        },
      },
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ siteId: "site-migrated", created: false });
  expect(inserts).toHaveLength(0);
});

test("reads a clean relational draft as the published revision", async () => {
  rows = [
    [site],
    [{
      schemaVersion: 2,
      settings,
      version: 2,
      isDirty: false,
      updatedAt: new Date("2026-08-08T12:00:00.000Z"),
    }],
    [storedPage],
    [storedBlock],
    [{ hostname: "academy.example.com" }],
  ];
  const response = await request("/shared-sites/site-1/editor");

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    revisionId: "rev-1",
    publishedRevisionId: "rev-1",
    hasDraft: false,
    domain: "academy.example.com",
  });
});

test("rejects a stale relational draft save", async () => {
  rows = [[site], [{ version: 2, isDirty: true }]];
  const response = await request("/shared-sites/site-1/draft", {
    method: "PUT",
    body: JSON.stringify({
      expectedRevisionId: "draft:site-1:1",
      schemaVersion: 2,
      config: templateConfig,
    }),
  });

  expect(response.status).toBe(409);
  expect(inserted).toBeNull();
});

test("saves page and block rows as a new relational draft version", async () => {
  const editedConfig = structuredClone(templateConfig);
  editedConfig.business.name = "Academy";
  editedConfig.pages[0]!.sections[0]!.props.title = "Updated";
  rows = [
    [site],
    [{ version: 1, isDirty: true }],
    [site],
    [{
      schemaVersion: 2,
      settings,
      version: 2,
      isDirty: true,
      updatedAt: new Date("2026-08-08T12:00:00.000Z"),
    }],
    [storedPage],
    [{ ...storedBlock, props: { title: "Updated" } }],
    [],
  ];
  returningRows = [[{ id: "page-home", pageKey: "home" }]];

  const response = await request("/shared-sites/site-1/draft", {
    method: "PUT",
    body: JSON.stringify({
      expectedRevisionId: "draft:site-1:1",
      schemaVersion: 2,
      config: editedConfig,
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    revisionId: "draft:site-1:2",
    config: {
      pages: [{ sections: [{ props: { title: "Updated" } }] }],
    },
  });
  expect(updates).toContainEqual(expect.objectContaining({ version: 2, isDirty: true }));
});

test("publishes only the expected relational draft", async () => {
  rows = [
    [site],
    [{
      schemaVersion: 2,
      settings,
      version: 2,
      isDirty: true,
      updatedBy: "admin",
    }],
    [storedPage],
    [storedBlock],
    [{ revisionNumber: 1 }],
    [{ hostname: "academy.example.com" }],
  ];
  returningRows = [[{ id: "rev-2" }]];
  const response = await request("/shared-sites/site-1/publish", {
    method: "POST",
    body: JSON.stringify({ expectedRevisionId: "draft:site-1:2" }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    siteId: "site-1",
    publishedRevisionId: "rev-2",
    domains: ["academy.example.com"],
  });
  expect(inserted).toEqual(expect.objectContaining({ status: "published" }));
  expect(updates).toContainEqual(expect.objectContaining({ status: "active", publishedRevisionId: "rev-2" }));
});

test("rejects publishing a draft outside the canonical site contract", async () => {
  rows = [
    [site],
    [{
      schemaVersion: 2,
      settings: {},
      version: 2,
      isDirty: true,
      updatedBy: "admin",
    }],
    [storedPage],
    [storedBlock],
  ];
  const response = await request("/shared-sites/site-1/publish", {
    method: "POST",
    body: JSON.stringify({ expectedRevisionId: "draft:site-1:2" }),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "SITE_CONFIG_INVALID" });
  expect(inserted).toBeNull();
});

test("retries an already completed publish idempotently", async () => {
  rows = [
    [{ ...site, publishedRevisionId: "rev-2" }],
    [{
      schemaVersion: 2,
      settings,
      version: 2,
      isDirty: false,
      updatedBy: "admin",
    }],
    [{ hostname: "academy.example.com" }],
  ];
  const response = await request("/shared-sites/site-1/publish", {
    method: "POST",
    body: JSON.stringify({ expectedRevisionId: "rev-2" }),
  });

  expect(response.status).toBe(200);
  expect(updates).toHaveLength(0);
});

test("adds a pending custom domain with Vercel DNS records", async () => {
  rows = [[site], []];
  returningRows = [[{ id: "dom-1" }]];
  vercelResponses = [
    Response.json({ error: { message: "Domain not found" } }, { status: 404 }),
    Response.json({
      name: "academy.example.com",
      apexName: "example.com",
      projectId: "sites-project",
      verified: false,
    }),
    Response.json({
      misconfigured: true,
      recommendedCNAME: [{ rank: 1, value: "project.vercel-dns.example." }],
    }),
  ];

  const response = await request("/shared-sites/site-1/domains", {
    method: "POST",
    body: JSON.stringify({ hostname: "Academy.Example.com" }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    domain: {
      id: "dom-1",
      hostname: "academy.example.com",
      status: "pending",
      source: "custom",
      misconfigured: true,
      dnsRecords: [{
        type: "CNAME",
        name: "academy",
        value: "project.vercel-dns.example.",
      }],
      verifiedAt: null,
      isCanonical: false,
    },
  });
  expect(updates).toContainEqual(expect.objectContaining({
    status: "pending",
    verificationData: expect.objectContaining({ provider: "vercel" }),
  }));
});

test("marks a custom domain verified only after DNS is configured", async () => {
  rows = [[site], [{
    id: "dom-1",
    hostname: "academy.example.com",
    status: "pending",
    verificationData: { source: "custom", provider: "vercel" },
    verifiedAt: null,
  }]];
  vercelResponses = [
    Response.json({
      name: "academy.example.com",
      apexName: "example.com",
      projectId: "sites-project",
      verified: true,
    }),
    Response.json({
      misconfigured: false,
      recommendedCNAME: [{ rank: 1, value: "project.vercel-dns.example." }],
    }),
  ];

  const response = await request(
    "/shared-sites/site-1/domains/academy.example.com/verify",
    { method: "POST" },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    domain: {
      id: "dom-1",
      hostname: "academy.example.com",
      status: "verified",
      source: "custom",
      misconfigured: false,
    },
  });
  expect(updates).toContainEqual(expect.objectContaining({
    status: "verified",
    verifiedAt: expect.any(Date),
  }));
});
