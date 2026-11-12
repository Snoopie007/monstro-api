import { describe, expect, test } from "bun:test";
import { deflateSync, inflateSync } from "node:zlib";
import { blackenSignaturePng } from "./signatureImage";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Buffer) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]); // CRC is not checked here
}

/** Encodes RGBA rows, cycling the None/Sub/Up row filters so decoding is exercised. */
function encodePng(width: number, height: number, pixels: Buffer, colorType = 6) {
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        const filter = y % 3;
        raw[y * (stride + 1)] = filter;
        for (let x = 0; x < stride; x++) {
            const value = pixels[y * stride + x]!;
            const left = x >= 4 ? pixels[y * stride + x - 4]! : 0;
            const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
            raw[y * (stride + 1) + 1 + x] = (value - (filter === 1 ? left : filter === 2 ? up : 0)) & 0xff;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = colorType;
    return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function decodeUnfiltered(png: Buffer) {
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    const idatLength = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    const stride = width * 4, pixels = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        expect(raw[y * (stride + 1)]).toBe(0);
        raw.copy(pixels, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    }
    return pixels;
}

describe("blackenSignaturePng", () => {
    test("turns white dark-mode strokes black and keeps transparency", () => {
        const width = 6, height = 5, pixels = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            if (i % 2) pixels.set([255, 255, 255, i % 4 ? 255 : 128], i * 4); // opaque and half-transparent white strokes
        }
        const result = decodeUnfiltered(Buffer.from(blackenSignaturePng(encodePng(width, height, pixels).toString("base64")), "base64"));
        for (let i = 0; i < width * height; i++) {
            expect([...result.subarray(i * 4, i * 4 + 3)]).toEqual([0, 0, 0]);
            expect(result[i * 4 + 3]).toBe(pixels[i * 4 + 3]!);
        }
    });

    test("returns anything other than an 8-bit RGBA PNG unchanged", () => {
        const rgb = encodePng(2, 2, Buffer.alloc(16), 2).toString("base64");
        expect(blackenSignaturePng(rgb)).toBe(rgb);
        expect(blackenSignaturePng("not a png")).toBe("not a png");
    });
});
