import { StoredSiteConfigSchema } from "@subtrees/site-config.js";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function configuredCredentials(config: unknown, monstroLocationId: string) {
  const parsed = StoredSiteConfigSchema.safeParse(config);
  if (!parsed.success) return null;
  const connection = parsed.data.locationConnections.find(
    (candidate) => candidate.locationId === monstroLocationId,
  );
  if (!connection) return null;
  const { ghlLocationId, privateIntegrationToken } = connection.leadRouting;
  return ghlLocationId.trim() && privateIntegrationToken.trim()
    ? {
        locationId: ghlLocationId.trim(),
        privateIntegrationToken: privateIntegrationToken.trim(),
      }
    : null;
}

/** Remove after the v2 production-config backfill is complete. */
function legacyCredentials(
  config: unknown,
  monstroLocationId: string,
  allowPrimaryFallback: boolean,
) {
  const ghl = record(record(record(config)?.integrations)?.ghl);
  const keyed = Array.isArray(ghl?.locations)
    ? ghl.locations.map(record).find((item) => item?.locationId === monstroLocationId)
    : undefined;
  const source = keyed ?? (allowPrimaryFallback ? ghl : null);
  const privateIntegrationToken = source?.privateIntegrationToken;
  const locationId = keyed?.ghlLocationId ?? source?.locationId;
  return typeof privateIntegrationToken === "string" && privateIntegrationToken.trim()
    && typeof locationId === "string" && locationId.trim()
    ? {
        privateIntegrationToken: privateIntegrationToken.trim(),
        locationId: locationId.trim(),
      }
    : null;
}

export function siteGhlCredentials(
  config: unknown,
  monstroLocationId: string,
  allowPrimaryLegacyFallback: boolean,
) {
  return configuredCredentials(config, monstroLocationId)
    ?? legacyCredentials(config, monstroLocationId, allowPrimaryLegacyFallback);
}
