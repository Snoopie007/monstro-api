export type SiteMapIdentitySource =
  | "gmb_place_id"
  | "places_place_id"
  | "coordinates";

export function siteLocationMapIdentity(
  locationMetadata: unknown,
  selectedGmb: unknown,
) {
  const metadata = (locationMetadata ?? {}) as {
    placeId?: unknown;
    lat?: unknown;
    lng?: unknown;
  };
  const gmbPlaceIdValue = (selectedGmb as {
    metadata?: { placeId?: unknown };
  } | null | undefined)?.metadata?.placeId;
  const [gmbPlaceId, placesPlaceId] = [gmbPlaceIdValue, metadata.placeId]
    .map((value) => {
      const id = typeof value === "string" ? value.trim() : "";
      return id.length > 0 && id.length <= 256 ? id : undefined;
    });
  const googlePlaceId = gmbPlaceId ?? placesPlaceId;
  const latitude = metadata.lat;
  const longitude = metadata.lng;
  const coordinates =
    typeof latitude === "number" && Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180
      ? { latitude, longitude }
      : undefined;
  const source: SiteMapIdentitySource | null = gmbPlaceId
    ? "gmb_place_id"
    : placesPlaceId
      ? "places_place_id"
      : coordinates
        ? "coordinates"
        : null;

  return { source, googlePlaceId, coordinates };
}
