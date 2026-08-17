import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { normalizeLocationSlug } from "@subtrees/schemas";

let siteLocationRows: Array<{
  siteId: string;
  locationId: string;
  publishedRevisionId?: string | null;
}> = [];
let selectedRows: unknown[][] = [];
const planRows: unknown[] = [];
const scheduleRows: unknown[] = [];
const postRows: unknown[] = [];
const productRows: unknown[] = [];
const submitGhlFormContact = mock(async () => undefined);

const selectBuilder = {
  from() {
    return this;
  },
  innerJoin() {
    return this;
  },
  leftJoin() {
    return this;
  },
  where() {
    return this;
  },
  orderBy() {
    return this;
  },
  then(resolve: (value: Array<{ total: number }>) => void) {
    resolve([{ total: postRows.length }]);
  },
  limit: mock(async () => selectedRows.shift() ?? siteLocationRows),
};

const db = {
  select: mock(() => selectBuilder),
  query: {
    memberPlans: {
      findMany: mock(async () => planRows),
      findFirst: mock(async () => null),
    },
    memberContracts: {
      findFirst: mock(async () => null),
      findMany: mock(async () => []),
    },
    members: {
      findFirst: mock(async () => null),
    },
    locations: {
      findFirst: mock(async () => ({
        timezone: "UTC",
        locationState: {
          status: "active",
          settings: { holidays: {} },
        },
      })),
    },
    programs: {
      findMany: mock(async () => scheduleRows),
    },
    websiteContents: {
      findMany: mock(async () => postRows),
      findFirst: mock(async () => postRows[0] ?? null),
    },
    products: {
      findMany: mock(async () => productRows),
      findFirst: mock(async () => productRows[0] ?? null),
    },
  },
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/middlewares/WebAuthMW", () => ({
  WebAuthMiddleware: (app: Elysia) => app.resolve(() => ({
    lid: "location-1",
    session: { user: { memberId: "member-1" } },
  })),
}));
mock.module("@/utils/generatePDF", () => ({
  generatePDF: mock(async () => undefined),
}));
mock.module("@/utils/contractUtils", () => ({
  renderContractContent: mock(() => ""),
}));
mock.module("@/handlers/formSubmissions", () => ({ submitGhlFormContact }));

const { webSiteRoutes } = await import("./sites");
const { webPlansRoutes } = await import("./plans");
const { webDocRoutes } = await import("./doc");
const app = new Elysia().use(webSiteRoutes);
const plansApp = new Elysia().use(webPlansRoutes);
const docsApp = new Elysia().use(webDocRoutes);

beforeEach(() => {
  siteLocationRows = [];
  selectedRows = [];
  db.select.mockClear();
  db.query.memberPlans.findMany.mockClear();
  db.query.locations.findFirst.mockClear();
  db.query.programs.findMany.mockClear();
  postRows.length = 0;
  productRows.length = 0;
  db.query.websiteContents.findMany.mockClear();
  db.query.products.findMany.mockClear();
  submitGhlFormContact.mockClear();
  Bun.env.MONSTRO_SITES_SERVICE_TOKEN = "sites-service-secret";
});
test("normalizes legacy location slugs for public site context", () => {
  expect(normalizeLocationSlug("gracie-humaita west craig"))
    .toBe("gracie-humaita-west-craig");
  expect(normalizeLocationSlug("odyssey-health-spa---fitness--inc-"))
    .toBe("odyssey-health-spa-fitness-inc");
});


test("rejects a location that is not attached to the requested site", async () => {
  const response = await app.handle(
    new Request("http://localhost/sites/site-1/locations/location-2/plans"),
  );

  expect(response.status).toBe(404);
  expect(db.query.memberPlans.findMany).not.toHaveBeenCalled();
});

test("requires service authorization for native form submissions", async () => {
  siteLocationRows = [{ siteId: "site-1", locationId: "location-1" }];
  const response = await app.handle(new Request(
    "http://localhost/sites/site-1/locations/location-1/forms/contact-form/submissions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: validFormContact }),
    },
  ));

  expect(response.status).toBe(401);
  expect(submitGhlFormContact).not.toHaveBeenCalled();
});

test("submits an authorized form only for an active attached location", async () => {
  selectedRows = [
    [{
      siteId: "site-1",
      locationId: "location-1",
      publishedRevisionId: "revision-1",
    }],
    [{
      config: {
        integrations: {
          ghl: {
            privateIntegrationToken: "private-token",
            locationId: "ghl-location",
          },
        },
      },
    }],
  ];
  const response = await app.handle(new Request(
    "http://localhost/sites/site-1/locations/location-1/forms/contact-form/submissions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer sites-service-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contact: validFormContact }),
    },
  ));

  expect(response.status).toBe(200);
  expect(submitGhlFormContact).toHaveBeenCalledWith({
    privateIntegrationToken: "private-token",
    locationId: "ghl-location",
  }, validFormContact);
});

const validFormContact = {
  firstName: "Jane",
  lastName: "Smith",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "5555555555",
  source: "Generated website form",
  tags: ["new lead", "web contact form"],
  customFields: [{ key: "program", field_value: "kids" }],
};

test("returns only the selected site's location plans", async () => {
  siteLocationRows = [{ siteId: "site-1", locationId: "location-1" }];

  const response = await app.handle(
    new Request("http://localhost/sites/site-1/locations/location-1/plans"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
  expect(db.query.memberPlans.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.any(Function),
    }),
  );
});

test("returns selected-location schedules and rejects invalid dates", async () => {
  siteLocationRows = [{ siteId: "site-1", locationId: "location-1" }];

  const response = await app.handle(
    new Request(
      "http://localhost/sites/site-1/locations/location-1/schedules?date=2024-02-30",
    ),
  );

  expect(response.status).toBe(400);
  expect(db.query.locations.findFirst).not.toHaveBeenCalled();

  const validResponse = await app.handle(
    new Request(
      "http://localhost/sites/site-1/locations/location-1/schedules?date=2024-02-29",
    ),
  );

  expect(validResponse.status).toBe(200);
  expect(await validResponse.json()).toEqual({ sessions: [] });
  expect(db.query.locations.findFirst).toHaveBeenCalledTimes(1);
});

test("returns only published posts for the selected site location", async () => {
  siteLocationRows = [{ siteId: "site-1", locationId: "location-1" }];
  postRows.push({
    id: "post-1",
    title: "Training Tips",
    slug: "training-tips",
    featuredImageUrl: null,
    publishedAt: new Date("2026-08-01T12:00:00.000Z"),
    updated: null,
  });

  const response = await app.handle(
    new Request("http://localhost/sites/site-1/locations/location-1/posts?page=1&limit=10"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    total: 1,
    posts: [{
      id: "post-1",
      title: "Training Tips",
      slug: "training-tips",
      featuredImageUrl: null,
      publishedAt: "2026-08-01T12:00:00.000Z",
      updatedAt: null,
    }],
  });
  expect(db.query.websiteContents.findMany).toHaveBeenCalled();
});

test("returns active products for the selected site location", async () => {
  siteLocationRows = [{ siteId: "site-1", locationId: "location-1" }];
  productRows.push({
    id: "product-1",
    slug: "academy-shirt",
    name: "Academy Shirt",
    category: "Apparel",
    subCategory: null,
    description: "Cotton shirt",
    brand: null,
    active: true,
    created: new Date("2026-08-01T12:00:00.000Z"),
    updated: null,
    variants: [{
      id: "variant-1",
      productId: "product-1",
      name: "Medium",
      sku: "shirt-m",
      color: null,
      size: "M",
      price: 2000,
      salePrice: null,
      stock: 5,
      active: true,
    }],
    images: [],
  });

  const response = await app.handle(
    new Request("http://localhost/sites/site-1/locations/location-1/products"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{
    id: "product-1",
    slug: "academy-shirt",
    name: "Academy Shirt",
    category: "Apparel",
    subCategory: null,
    description: "Cotton shirt",
    brand: null,
    active: true,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: null,
    variants: [{
      id: "variant-1",
      productId: "product-1",
      name: "Medium",
      sku: "shirt-m",
      color: null,
      size: "M",
      price: 2000,
      salePrice: null,
      stock: 5,
      active: true,
    }],
    images: [],
  }]);
  expect(db.query.products.findMany).toHaveBeenCalled();
});

test("rejects plan docs from a different selected location", async () => {
  const response = await plansApp.handle(
    new Request("http://localhost/plans/plan-foreign/docs"),
  );

  expect(response.status).toBe(404);
  expect(db.query.memberPlans.findFirst).toHaveBeenCalled();
});

test("does not render a contract from another member or location", async () => {
  const response = await docsApp.handle(
    new Request("http://localhost/docs/doc-foreign/content"),
  );

  expect(response.status).toBe(404);
  expect(db.query.memberContracts.findFirst).toHaveBeenCalled();
});
