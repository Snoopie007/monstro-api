import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(data: Buffer) {
    let crc = 0xffffffff;
    for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
}

/** Undoes the per-row PNG filters (spec section 9) in place. */
function unfilter(raw: Buffer, width: number, height: number, bytesPerPixel: number) {
    const stride = width * bytesPerPixel;
    const rows = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)]!;
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const left = x >= bytesPerPixel ? rows[y * stride + x - bytesPerPixel]! : 0;
            const up = y > 0 ? rows[(y - 1) * stride + x]! : 0;
            const upLeft = x >= bytesPerPixel && y > 0 ? rows[(y - 1) * stride + x - bytesPerPixel]! : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = up;
            else if (filter === 3) predictor = (left + up) >> 1;
            else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
                predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            }
            rows[y * stride + x] = (line[x]! + predictor) & 0xff;
        }
    }
    return rows;
}

/**
 * Signature pads save strokes on a transparent background in the theme's text color, so a signature made in the
 * app's dark mode is white and disappears on a white page. Returns the same PNG with every stroke black and the
 * transparency kept. Anything other than an 8-bit, non-interlaced RGBA PNG (what both signing pads save) is
 * returned unchanged.
 */
export function blackenSignaturePng(base64: string): string {
    try {
        const png = Buffer.from(base64, "base64");
        if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return base64;
        let offset = 8, width = 0, height = 0, ihdr: Buffer | null = null;
        const idat: Buffer[] = [];
        while (offset < png.length) {
            const length = png.readUInt32BE(offset);
            const type = png.toString("ascii", offset + 4, offset + 8);
            const data = png.subarray(offset + 8, offset + 8 + length);
            if (type === "IHDR") {
                ihdr = data;
                width = data.readUInt32BE(0);
                height = data.readUInt32BE(4);
            } else if (type === "IDAT") idat.push(data);
            offset += 12 + length;
        }
        // Bit depth 8, color type 6 (RGBA), interlace 0.
        if (!ihdr || ihdr[8] !== 8 || ihdr[9] !== 6 || ihdr[12] !== 0) return base64;

        const pixels = unfilter(inflateSync(Buffer.concat(idat)), width, height, 4);
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
        }
        const stride = width * 4;
        const raw = Buffer.alloc((stride + 1) * height);
        for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
        return Buffer.concat([
            PNG_SIGNATURE,
            chunk("IHDR", Buffer.from(ihdr)),
            chunk("IDAT", deflateSync(raw)),
            chunk("IEND", Buffer.alloc(0)),
        ]).toString("base64");
    } catch {
        return base64;
    }
}
