import { afterEach, expect, test } from "bun:test";
import { GoogleAdsApi } from "google-ads-api";
import { createSitePreset, storedSiteConfigFromStored } from "@/subtrees/site-config.js";
import { publishedAdsDestinations } from "./adsSiteDestinations";
import { ensureMxAssets, mxSitelinkSpecs } from "./google";

function program(id: string, slug: string, name: string) {
  return {
    id,
    slug,
    name,
    description: `${name} classes`,
    visible: true,
    showLearnMore: true,
    detail: {
      title: name,
      ageRange: "4-6",
      previousRequirement: "None",
      description: `${name} classes`,
      challengeHeading: "Fit",
      challenges: ["Focus"],
    },
  };
}

function detailPage(id: string, path: string, programId: string, serviceLocationId?: string) {
  return {
    id,
    kind: "sections" as const,
    path,
    visible: true,
    ...(serviceLocationId ? { serviceLocationId } : {}),
    metadata: { title: id },
    sections: [{ id: `${id}-detail`, type: "program_detail" as const, visible: true, props: { programId } }],
  };
}

function publishedRevision() {
  const stored = storedSiteConfigFromStored(createSitePreset({
    preset: "scale", businessName: "AKA", tagline: "Train",
  }), "scale", [
    { locationId: "location-hammocks", isPrimary: true, displayOrder: 0 },
    { locationId: "location-west", isPrimary: false, displayOrder: 1 },
  ]);
  return {
    ...stored,
    content: {
      ...stored.content,
      programs: [
        program("legacy", "adult-mma", "Adult MMA"),
        program("dragon-hammocks", "little-dragon-hammocks", "Little Dragon"),
        program("dragon-west", "little-dragon-west", "Little Dragon West"),
      ],
    },
    pages: [
      ...stored.pages,
      detailPage("program-adult-mma", "/programs/adult-mma", "legacy"),
      detailPage("program-hammocks", "/hammocks/little-dragon-classes", "dragon-hammocks", "location-hammocks"),
      detailPage("program-west", "/west-kendall/little-dragon-classes", "dragon-west", "location-west"),
    ],
  };
}

test("uses resolved published page paths and only this location's pinned programs", () => {
  const destinations = publishedAdsDestinations(publishedRevision(), "scale", "location-hammocks");
  expect(destinations.programs).toEqual([
    { name: "Adult MMA", path: "/programs/adult-mma" },
    { name: "Little Dragon", path: "/hammocks/little-dragon-classes" },
  ]);

  const links = mxSitelinkSpecs("https://aka.example.com", destinations.pages, destinations.programs);
  expect(links.map((link) => link.url)).toContain("https://aka.example.com/hammocks/little-dragon-classes");
  expect(links.map((link) => link.url).some((url) => url.includes("/programs/little-dragon"))).toBe(false);

  expect(publishedAdsDestinations(publishedRevision(), "scale", "location-west").programs)
    .toEqual([
      { name: "Adult MMA", path: "/programs/adult-mma" },
      { name: "Little Dragon West", path: "/west-kendall/little-dragon-classes" },
    ]);
});

type AssetRow = { asset: Record<string, unknown> };

const originalCustomer = GoogleAdsApi.prototype.Customer;
afterEach(() => {
  GoogleAdsApi.prototype.Customer = originalCustomer;
});

/** Mocks the SDK customer: assets, account-level links, and captured mutations. */
function mockAdsAccount(assets: AssetRow[], links: Array<{ asset: string; fieldType: string }>) {
  const mutations: Array<{ entity: string; operation: string; resource: unknown }> = [];
  GoogleAdsApi.prototype.Customer = (() => ({
    credentials: { customer_id: "123" },
    query: async (gaql: string) => {
      if (gaql.includes("FROM customer_asset")) {
        expect(gaql).toContain("customer_asset.resource_name");
        return links.map((link) => ({
          customer_asset: {
            resource_name: `customers/123/customerAssets/${link.asset.split("/").pop()}~${link.fieldType}`,
            asset: link.asset,
            field_type: link.fieldType,
          },
        }));
      }
      expect(gaql).toContain("asset.final_urls");
      expect(gaql).toContain("asset.name");
      return assets;
    },
    mutateResources: async (operations: typeof mutations) => {
      mutations.push(...operations);
      return {};
    },
  })) as unknown as typeof GoogleAdsApi.prototype.Customer;
  return mutations;
}

function sitelink(id: number, name: string, text: string, url: string): AssetRow {
  return {
    asset: {
      resource_name: `customers/123/assets/${id}`,
      name,
      type: "SITELINK",
      final_urls: [url],
      sitelink_asset: { link_text: text },
    },
  };
}

const callout: AssetRow = {
  asset: { resource_name: "customers/123/assets/9", name: "MX Book a Trial", type: "CALLOUT", callout_asset: { callout_text: "Book a Trial" } },
};

function standardAssets(dragonUrl: string, dragonName = "MX Little Dragon") {
  return [
    sitelink(1, "MX Tour", "Tour", "https://aka.example.com/"),
    sitelink(2, "MX Reviews", "Reviews", "https://aka.example.com/"),
    sitelink(3, "MX Pricing", "Pricing", "https://aka.example.com/pricing"),
    sitelink(4, dragonName, "Little Dragon", dragonUrl),
    callout,
  ];
}

const allLinked = [1, 2, 3, 4].map((id) => ({ asset: `customers/123/assets/${id}`, fieldType: "SITELINK" }))
  .concat({ asset: "customers/123/assets/9", fieldType: "CALLOUT" });

const movedProgram = {
  website: "https://aka.example.com",
  programs: [{ name: "Little Dragon", path: "/hammocks/little-dragon-classes" }],
};

test("leaves an account unchanged when every sitelink already has its URL", async () => {
  const mutations = mockAdsAccount(
    standardAssets("https://aka.example.com/hammocks/little-dragon-classes"),
    allLinked,
  );
  const result = await ensureMxAssets("123", "token", movedProgram);
  expect(mutations).toEqual([]);
  expect(result.sitelinks).toEqual(["Tour", "Reviews", "Pricing", "Little Dragon"]);
});

test("replaces a managed program sitelink whose page moved and unlinks only the old account link", async () => {
  const mutations = mockAdsAccount(
    standardAssets("https://aka.example.com/programs/little-dragon"),
    allLinked,
  );
  await ensureMxAssets("123", "token", movedProgram);

  expect(mutations).toEqual([
    { entity: "customer_asset", operation: "remove", resource: "customers/123/customerAssets/4~SITELINK" },
    {
      entity: "asset",
      operation: "create",
      resource: {
        resource_name: "customers/123/assets/-1",
        name: "MX Little Dragon (/hammocks/little-dragon-classes)",
        final_urls: ["https://aka.example.com/hammocks/little-dragon-classes"],
        sitelink_asset: { link_text: "Little Dragon" },
      },
    },
    {
      entity: "customer_asset",
      operation: "create",
      resource: { asset: "customers/123/assets/-1", field_type: expect.anything() },
    },
  ]);
  // No asset is edited in place, so other campaigns keep their own links.
  expect(mutations.some((mutation) => mutation.operation === "update")).toBe(false);
});

test("re-running after a replacement reuses the new asset", async () => {
  const assets = standardAssets("https://aka.example.com/programs/little-dragon");
  assets.push(sitelink(10, "MX Little Dragon (/hammocks/little-dragon-classes)", "Little Dragon", "https://aka.example.com/hammocks/little-dragon-classes"));
  const links = allLinked.filter((link) => link.asset !== "customers/123/assets/4")
    .concat({ asset: "customers/123/assets/10", fieldType: "SITELINK" });
  const mutations = mockAdsAccount(assets, links);
  await ensureMxAssets("123", "token", movedProgram);
  expect(mutations).toEqual([]);
});

test("never unlinks a manual sitelink that shares the program's text", async () => {
  const mutations = mockAdsAccount(
    standardAssets("https://aka.example.com/programs/little-dragon", "Spring promo"),
    allLinked,
  );
  await ensureMxAssets("123", "token", movedProgram);
  expect(mutations.filter((mutation) => mutation.operation === "remove")).toEqual([]);
  expect(mutations).toContainEqual(expect.objectContaining({
    entity: "asset",
    operation: "create",
    resource: expect.objectContaining({
      name: "MX Little Dragon",
      final_urls: ["https://aka.example.com/hammocks/little-dragon-classes"],
    }),
  }));
});

test("keeps both offerings when two programs share link text", async () => {
  const assets = standardAssets("https://aka.example.com/hammocks/little-dragon-classes");
  const mutations = mockAdsAccount(assets, allLinked);
  await ensureMxAssets("123", "token", {
    website: "https://aka.example.com",
    programs: [
      { name: "Little Dragon", path: "/hammocks/little-dragon-classes" },
      { name: "Little Dragon", path: "/offers/little-dragon" },
    ],
  });
  expect(mutations.filter((mutation) => mutation.operation === "remove")).toEqual([]);
  expect(mutations.filter((mutation) => mutation.entity === "asset")).toEqual([
    expect.objectContaining({
      resource: expect.objectContaining({ final_urls: ["https://aka.example.com/offers/little-dragon"] }),
    }),
  ]);
});
