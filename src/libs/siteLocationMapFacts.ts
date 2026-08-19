export type SiteMapCoverage =
  | "gmb_place_id"
  | "places_place_id"
  | "coordinates"
  | "full_address"
  | "no_target";

type SiteLocationMapFacts = {
  googlePlaceId?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function placeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  return candidate.length > 0 && candidate.length <= 256 ? candidate : undefined;
}

export function selectedGmbPlaceId(value: unknown): string | undefined {
  const metadata = record(record(value)?.metadata);
  return placeId(metadata?.placeId);
}

export function placesMetadataPlaceId(value: unknown): string | undefined {
  return placeId(record(value)?.placeId);
}

export function projectSiteLocationMapFacts(
  locationMetadata: unknown,
  selectedGmb: unknown,
): SiteLocationMapFacts {
  const metadata = record(locationMetadata);
  const googlePlaceId = selectedGmbPlaceId(selectedGmb)
    ?? placesMetadataPlaceId(metadata);
  const latitude = metadata?.lat;
  const longitude = metadata?.lng;
  const coordinates =
    typeof latitude === "number" && Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180
      ? { latitude, longitude }
      : undefined;

  return {
    ...(googlePlaceId ? { googlePlaceId } : {}),
    ...(coordinates ? { coordinates } : {}),
  };
}

export function classifySiteMapCoverage(input: {
  locationMetadata: unknown;
  selectedGmb: unknown;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): SiteMapCoverage {
  if (selectedGmbPlaceId(input.selectedGmb)) return "gmb_place_id";
  if (placesMetadataPlaceId(input.locationMetadata)) return "places_place_id";
  if (projectSiteLocationMapFacts(input.locationMetadata, null).coordinates) {
    return "coordinates";
  }
  if ([input.address, input.city, input.country]
    .every((value) => typeof value === "string" && value.trim())) {
    return "full_address";
  }
  return "no_target";
}
