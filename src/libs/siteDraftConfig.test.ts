import { expect, test } from "bun:test";
import { createSitePreset, storedSiteConfigFromStored } from "@subtrees/site-config.js";
import { splitSiteConfig, publicSiteConfig } from "./siteDraftConfig";

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
