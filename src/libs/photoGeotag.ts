import piexif from "piexifjs";

export type Coordinates = { latitude: number; longitude: number };

/** The coordinates when both are numbers in range, else null. */
function coordinates(latitude: unknown, longitude: unknown): Coordinates | null {
    return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
        && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180
        ? { latitude, longitude }
        : null;
}

/**
 * Where a profile's photos are tagged: the pin the owner set on Google, else the location's
 * address coordinates (`locations.metadata.lat/lng`, the ones the site map uses).
 */
export function photoCoordinates(
    profile: { latitude?: number | null; longitude?: number | null } | null,
    locationMetadata: unknown,
) {
    // SAFETY: locations.metadata is untyped jsonb; coordinates() checks each value.
    const metadata = (locationMetadata ?? {}) as { lat?: unknown; lng?: unknown };

    return coordinates(profile?.latitude, profile?.longitude) ?? coordinates(metadata.lat, metadata.lng);
}

/**
 * Writes the coordinates into a JPEG's EXIF GPS block. Every other EXIF tag (camera, orientation)
 * stays; GPS the phone wrote is replaced. Throws when the bytes aren't a JPEG piexifjs can read.
 */
export function geotagJpeg(jpeg: Uint8Array, { latitude, longitude }: Coordinates) {
    // piexifjs works on binary strings, one character per byte.
    const binary = Buffer.from(jpeg).toString("binary");
    const exif = piexif.load(binary);
    exif.GPS = {
        [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
        [piexif.GPSIFD.GPSLatitudeRef]: latitude < 0 ? "S" : "N",
        [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(Math.abs(latitude)),
        [piexif.GPSIFD.GPSLongitudeRef]: longitude < 0 ? "W" : "E",
        [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(Math.abs(longitude)),
    };

    return Buffer.from(piexif.insert(piexif.dump(exif), binary), "binary");
}
