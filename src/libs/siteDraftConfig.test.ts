import { expect, test } from "bun:test";
import {
  createSitePreset,
  PublishableStoredSiteConfigSchema,
  storedSiteConfigFromStored,
} from "@/subtrees/site-config.js";
import {
  assembleSiteConfig,
  publicSiteConfig,
  splitSiteConfig,
  type StoredBlockRow,
  type StoredPageRow,
} from "./siteDraftConfig";

test("splits publishable configs with a shared GHL destination and keeps credentials private", () => {
  const stored = storedSiteConfigFromStored(createSitePreset({
    preset: "scale", businessName: "Academy", tagline: "Train well",
  }), "scale", [
    { locationId: "location-1", isPrimary: true, displayOrder: 0 },
    { locationId: "location-2", isPrimary: false, displayOrder: 1 },
  ]);
  const config = {
    ...stored,
    locationConnections: stored.locationConnections.map((connection) => ({
      ...connection,
      leadRouting: { ghlLocationId: "ghl-shared", privateIntegrationToken: "pit-shared" },
    })),
  };
  expect(splitSiteConfig(config).settings.locationConnections).toEqual(config.locationConnections);
  const published = publicSiteConfig(config);
  expect(published.locationConnections!.map((connection) => connection.locationId))
    .toEqual(["location-1", "location-2"]);
  for (const connection of published.locationConnections!) {
    expect(connection).not.toHaveProperty("leadRouting");
  }
});

function scopedProgramConfig() {
  const stored = storedSiteConfigFromStored(createSitePreset({
    preset: "scale", businessName: "AKA", tagline: "Train well",
  }), "scale", [
    { locationId: "location-hammocks", isPrimary: true, displayOrder: 0 },
    { locationId: "location-west-kendall", isPrimary: false, displayOrder: 1 },
  ]);
  return {
    ...stored,
    locationConnections: stored.locationConnections.map((connection) => ({
      ...connection,
      leadRouting: { ghlLocationId: `ghl-${connection.locationId}`, privateIntegrationToken: "pit" },
    })),
    content: {
      ...stored.content,
      programs: [{
        id: "dragon-hammocks",
        slug: "little-dragon-hammocks",
        name: "Little Dragon",
        description: "Kids classes",
        visible: true,
        showLearnMore: true,
        detail: {
          title: "Little Dragon",
          ageRange: "4-6",
          previousRequirement: "None",
          description: "Kids classes",
          challengeHeading: "Fit",
          challenges: ["Focus"],
        },
      }],
    },
    pages: [
      ...stored.pages,
      {
        id: "program-little-dragon-hammocks",
        kind: "sections" as const,
        path: "/hammocks/little-dragon-classes",
        visible: true,
        serviceLocationId: "location-west-kendall",
        metadata: { title: "Little Dragon" },
        sections: [{
          id: "program-little-dragon-hammocks-detail",
          type: "program_detail" as const,
          visible: true,
          props: { programId: "dragon-hammocks" },
        }],
      },
    ],
  };
}

function rowsFrom(split: ReturnType<typeof splitSiteConfig>) {
  const pages: StoredPageRow[] = split.pages.map(({ blocks: _blocks, ...page }) => ({
    ...page,
    id: `row-${page.pageKey}`,
  }));
  const blocks: StoredBlockRow[] = split.pages.flatMap((page) =>
    page.blocks.map((block) => ({ ...block, pageId: `row-${page.pageKey}` }))
  );
  return { schemaVersion: split.schemaVersion, settings: split.settings, pages, blocks };
}

test("page path and service location survive split, assemble, and public reads", () => {
  const split = splitSiteConfig(scopedProgramConfig());
  const row = split.pages.find((page) => page.pageKey === "program-little-dragon-hammocks");
  expect(row?.settings).toEqual({ serviceLocationId: "location-west-kendall" });
  expect(split.pages.find((page) => page.pageKey === "home")?.settings)
    .not.toHaveProperty("serviceLocationId");

  const assembled = assembleSiteConfig(rowsFrom(split));
  const reparsed = PublishableStoredSiteConfigSchema.parse(assembled);
  expect(reparsed.pages.find((page) => page.id === "program-little-dragon-hammocks"))
    .toMatchObject({ path: "/hammocks/little-dragon-classes", serviceLocationId: "location-west-kendall" });
  expect(reparsed.pages.find((page) => page.id === "home")).not.toHaveProperty("serviceLocationId");

  const published = publicSiteConfig(reparsed);
  expect(published.pages.find((page) => page.id === "program-little-dragon-hammocks"))
    .toMatchObject({ path: "/hammocks/little-dragon-classes", serviceLocationId: "location-west-kendall" });
  expect(JSON.stringify(published)).not.toContain("pit");
});

test("assembly keeps a malformed stored binding so validation rejects it", () => {
  for (const value of [null, "", 5, "location-gone"]) {
    const rows = rowsFrom(splitSiteConfig(scopedProgramConfig()));
    const row = rows.pages.find((page) => page.pageKey === "program-little-dragon-hammocks")!;
    row.settings = { serviceLocationId: value };
    const assembled = assembleSiteConfig(rows);
    const page = (assembled.pages as Array<Record<string, unknown>>)
      .find((candidate) => candidate.id === "program-little-dragon-hammocks");
    expect(page).toHaveProperty("serviceLocationId", value);
    expect(() => PublishableStoredSiteConfigSchema.parse(assembled)).toThrow();
    expect(() => splitSiteConfig(assembled)).toThrow();
    expect(() => storedSiteConfigFromStored(assembled, "scale", [])).toThrow();
  }
});
