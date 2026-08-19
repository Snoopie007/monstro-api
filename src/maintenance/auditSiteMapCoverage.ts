import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/db";
import { siteLocationMapFacts, type SiteMapCoverage } from "@/libs/siteLocationMapFacts";
import {
  locations,
  locationState,
  websiteSiteLocations,
  websiteSites,
} from "@subtrees/schemas";

function readScope(args: string[]): { allActive: boolean; siteIds: string[] } {
  const allActive = args.includes("--all-active");
  const siteIds = args.flatMap((arg, index) => {
    if (arg !== "--site-id") return [];
    const siteId = args[index + 1]?.trim();
    if (!siteId || siteId.startsWith("--")) {
      throw new Error("--site-id requires a site ID");
    }
    return [siteId];
  });

  if (allActive === (siteIds.length > 0)) {
    throw new Error(
      "Choose exactly one scope: --site-id <id> (repeatable) or --all-active",
    );
  }
  return { allActive, siteIds: [...new Set(siteIds)] };
}

async function main() {
  const scope = readScope(Bun.argv.slice(2));
  const rows = await db
    .select({
      siteId: websiteSites.id,
      locationId: locations.id,
      locationName: locations.name,
      isPrimary: websiteSiteLocations.isPrimary,
      metadata: locations.metadata,
      selectedGmb: locationState.gmb,
      address: locations.address,
      city: locations.city,
      country: locations.country,
    })
    .from(websiteSites)
    .innerJoin(
      websiteSiteLocations,
      eq(websiteSiteLocations.siteId, websiteSites.id),
    )
    .innerJoin(locations, eq(locations.id, websiteSiteLocations.locationId))
    .leftJoin(locationState, eq(locationState.locationId, locations.id))
    .where(and(
      eq(websiteSites.status, "active"),
      scope.allActive ? undefined : inArray(websiteSites.id, scope.siteIds),
    ));

  const summary: Record<SiteMapCoverage, number> = {
    gmb_place_id: 0,
    places_place_id: 0,
    coordinates: 0,
    full_address: 0,
    no_target: 0,
  };
  const audited = rows.map((row) => {
    const source = siteLocationMapFacts({
      locationMetadata: row.metadata,
      selectedGmb: row.selectedGmb,
      address: row.address,
      city: row.city,
      country: row.country,
    }).source;
    summary[source] += 1;
    return {
      siteId: row.siteId,
      locationId: row.locationId,
      locationName: row.locationName,
      isPrimary: row.isPrimary,
      source,
    };
  });

  console.log(JSON.stringify({
    scope: scope.allActive ? "all_active" : { siteIds: scope.siteIds },
    summary,
    locations: audited,
  }, null, 2));
}

try {
  await main();
} finally {
  await db.$client.end();
}
