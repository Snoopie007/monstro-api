import { describe, expect, test } from "bun:test";
import piexif from "piexifjs";
import { geotagJpeg, photoCoordinates } from "./photoGeotag";

/** A 1x1 white JPEG with no EXIF. */
const PIXEL = Buffer.from(
    "/9j/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBQMDAwUGBQUFBQYIBgYGBgYICggICAgICAoKCgoKCgoKDAwMDAwMDg4ODg4PDw8PDw8PDw8P/9sAQwECAgIEBAQHBAQHEAsJCxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ/90ABAAB/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==",
    "base64",
);

function readExif(jpeg: Buffer) {
    const exif = piexif.load(jpeg.toString("binary"));
    const gps = exif.GPS ?? {};

    return {
        latitude: piexif.GPSHelper.dmsRationalToDeg(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef]),
        longitude: piexif.GPSHelper.dmsRationalToDeg(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef]),
        orientation: exif["0th"]?.[piexif.ImageIFD.Orientation],
    };
}

describe("geotagJpeg", () => {
    test("writes the coordinates and keeps the photo's other EXIF tags", () => {
        const exif = piexif.load(PIXEL.toString("binary"));
        exif["0th"] = { [piexif.ImageIFD.Orientation]: 6 };
        const rotated = Buffer.from(piexif.insert(piexif.dump(exif), PIXEL.toString("binary")), "binary");

        const tagged = readExif(geotagJpeg(rotated, { latitude: -33.4489, longitude: -70.6693 }));

        expect(tagged.latitude).toBeCloseTo(-33.4489, 5);
        expect(tagged.longitude).toBeCloseTo(-70.6693, 5);
        expect(tagged.orientation).toBe(6);
    });
});

describe("photoCoordinates", () => {
    test("uses the Google pin, then the location's coordinates", () => {
        expect(photoCoordinates({ latitude: 1, longitude: 2 }, { lat: 3, lng: 4 })).toEqual({ latitude: 1, longitude: 2 });
        expect(photoCoordinates({ latitude: null, longitude: null }, { lat: 3, lng: 4 })).toEqual({ latitude: 3, longitude: 4 });
        expect(photoCoordinates(null, { lat: "3", lng: 200 })).toBeNull();
    });
});
