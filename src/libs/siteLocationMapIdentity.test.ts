import { expect, test } from "bun:test";
import { siteLocationMapIdentity } from "./siteLocationMapIdentity";

test("prefers selected GMB identity before Places metadata and coordinates", () => {
  expect(siteLocationMapIdentity(
    { placeId: "places-id", lat: 37.3318, lng: -121.891 },
    { metadata: { placeId: "  gmb-id  ", mapsUri: "https://maps.google.com/example" } },
  )).toEqual({
    source: "gmb_place_id",
    googlePlaceId: "gmb-id",
    coordinates: { latitude: 37.3318, longitude: -121.891 },
  });
});

test("falls back through Places identity, coordinates, and no identity", () => {
  expect(siteLocationMapIdentity(
    { placeId: "places-id", lat: "37.3318", lng: Number.NaN },
    { metadata: { placeId: { id: "bad" } } },
  )).toEqual({
    source: "places_place_id",
    googlePlaceId: "places-id",
    coordinates: undefined,
  });
  expect(siteLocationMapIdentity(
    { placeId: " ", lat: 0, lng: 0 },
    { metadata: null },
  )).toEqual({
    source: "coordinates",
    googlePlaceId: undefined,
    coordinates: { latitude: 0, longitude: 0 },
  });
  expect(siteLocationMapIdentity(null, { metadata: { placeId: " " } })).toEqual({
    source: null,
    googlePlaceId: undefined,
    coordinates: undefined,
  });
});
