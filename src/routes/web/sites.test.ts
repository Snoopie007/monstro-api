import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let siteLocationRows: Array<{ siteId: string; locationId: string }> = [];
const planRows: unknown[] = [];
const scheduleRows: unknown[] = [];
const postRows: unknown[] = [];
const productRows: unknown[] = [];

const selectBuilder = {
  from() {
    return this;
  },
  innerJoin() {
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
  limit: mock(async () => siteLocationRows),
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

const { webSiteRoutes } = await import("./sites");
const { webPlansRoutes } = await import("./plans");
const { webDocRoutes } = await import("./doc");
const app = new Elysia().use(webSiteRoutes);
const plansApp = new Elysia().use(webPlansRoutes);
const docsApp = new Elysia().use(webDocRoutes);

beforeEach(() => {
  siteLocationRows = [];
  db.select.mockClear();
  db.query.memberPlans.findMany.mockClear();
  db.query.locations.findFirst.mockClear();
  db.query.programs.findMany.mockClear();
  postRows.length = 0;
  productRows.length = 0;
  db.query.websiteContents.findMany.mockClear();
  db.query.products.findMany.mockClear();
});

test("rejects a location that is not attached to the requested site", async () => {
  const response = await app.handle(
    new Request("http://localhost/sites/site-1/locations/location-2/plans"),
  );

  expect(response.status).toBe(404);
  expect(db.query.memberPlans.findMany).not.toHaveBeenCalled();
});

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
  expect(await response.json()).toEqual(productRows);
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
