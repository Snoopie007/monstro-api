export type SiteMapCoverage =
  | "gmb_place_id"
  | "places_place_id"
  | "coordinates"
  | "full_address"
  | "no_target";

export function siteLocationMapFacts(input: {
  locationMetadata: unknown;
  selectedGmb: unknown;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const metadata = (input.locationMetadata ?? {}) as {
    placeId?: unknown;
    lat?: unknown;
    lng?: unknown;
  };
  const gmbPlaceIdValue = (input.selectedGmb as {
    metadata?: { placeId?: unknown };
  } | null | undefined)?.metadata?.placeId;
  const [gmbPlaceId, placesPlaceId] = [gmbPlaceIdValue, metadata.placeId]
    .map((value) => {
      const id = typeof value === "string" ? value.trim() : "";
      return id.length > 0 && id.length <= 256 ? id : undefined;
    });
  const googlePlaceId = gmbPlaceId ?? placesPlaceId;
  const latitude = metadata?.lat;
  const longitude = metadata?.lng;
  const coordinates =
    typeof latitude === "number" && Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180
      ? { latitude, longitude }
      : undefined;
  let source: SiteMapCoverage = "no_target";
  if (gmbPlaceId) source = "gmb_place_id";
  else if (placesPlaceId) source = "places_place_id";
  else if (coordinates) source = "coordinates";
  else if ([input.address, input.city, input.country]
    .every((value) => typeof value === "string" && value.trim())) {
    source = "full_address";
  }

  return {
    source,
    location: {
      ...(googlePlaceId ? { googlePlaceId } : {}),
      ...(coordinates ? { coordinates } : {}),
    },
  };
}
