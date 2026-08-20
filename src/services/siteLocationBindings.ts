import { asc, eq, inArray } from "drizzle-orm";
import {
  StoredSiteConfigSchema,
  storedSiteConfigFromStored,
} from "@subtrees/site-config.js";
import {
  locations,
  websiteSiteLocations,
} from "@subtrees/schemas";
import { db } from "@/db/db";
import { SiteEditorError } from "./siteEditorError";

export type SiteTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type StoredSiteConfig = ReturnType<typeof StoredSiteConfigSchema.parse>;

type LocationConnectionSnapshot = {
  locationId: string;
  isPrimary: boolean;
  displayOrder: number;
};

async function persistedConnections(
  tx: SiteTransaction,
  siteId: string,
): Promise<LocationConnectionSnapshot[]> {
  return tx
    .select({
      locationId: websiteSiteLocations.locationId,
      isPrimary: websiteSiteLocations.isPrimary,
      displayOrder: websiteSiteLocations.displayOrder,
    })
    .from(websiteSiteLocations)
    .where(eq(websiteSiteLocations.siteId, siteId))
    .orderBy(
      asc(websiteSiteLocations.displayOrder),
      asc(websiteSiteLocations.locationId),
    );
}

export async function normalizeEditorSiteConfig(
  tx: SiteTransaction,
  input: {
    siteId: string;
    vendorId: string;
    plan: "growth" | "scale";
    config: unknown;
  },
) {
  const persisted = await persistedConnections(tx, input.siteId);
  const config = storedSiteConfigFromStored(
    input.config,
    input.plan,
    persisted,
  );
  const siteLocations = await loadSiteLocations(
    tx,
    input.vendorId,
    config.locationConnections,
  );
  return { config, siteLocations };
}

export async function validateStoredLocationConnections(
  tx: SiteTransaction,
  vendorId: string,
  config: StoredSiteConfig,
) {
  await loadSiteLocations(tx, vendorId, config.locationConnections);
  return config.locationConnections;
}

export async function syncPublishedLocations(
  tx: SiteTransaction,
  siteId: string,
  vendorId: string,
  config: StoredSiteConfig,
) {
  const connections = await validateStoredLocationConnections(tx, vendorId, config);
  await tx.delete(websiteSiteLocations).where(eq(websiteSiteLocations.siteId, siteId));
  await tx.insert(websiteSiteLocations).values(
    connections.map(({ locationId, isPrimary, displayOrder }) => ({
      siteId,
      locationId,
      isPrimary,
      displayOrder,
    })),
  );
}

async function loadSiteLocations(
  tx: SiteTransaction,
  vendorId: string,
  connections: readonly LocationConnectionSnapshot[],
) {
  const rows = await tx
    .select({
      id: locations.id,
      vendorId: locations.vendorId,
      name: locations.name,
      address: locations.address,
      city: locations.city,
      state: locations.state,
      postalCode: locations.postalCode,
      country: locations.country,
      phone: locations.phone,
      email: locations.email,
      timezone: locations.timezone,
    })
    .from(locations)
    .where(inArray(locations.id, connections.map((connection) => connection.locationId)));
  const byId = new Map(rows.map((location) => [location.id, location]));
  if (
    rows.length !== connections.length ||
    rows.some((location) => location.vendorId !== vendorId)
  ) {
    throw new SiteEditorError(
      400,
      "SITE_LOCATION_INVALID",
      "Every connected location must exist and belong to the site's vendor",
    );
  }
  return connections.map(({ locationId, isPrimary, displayOrder }) => {
    const location = byId.get(locationId)!;
    const { vendorId: _vendorId, ...publicLocation } = location;
    return { ...publicLocation, isPrimary, displayOrder };
  });
}
