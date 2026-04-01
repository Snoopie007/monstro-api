const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateUUID(prefix = ''): string {
    const bytes = new Uint8Array(12);
    if (
        typeof globalThis !== 'undefined' &&
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.getRandomValues === 'function'
    ) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
    }

    let n = 0n;
    for (let i = 0; i < 12; i++) {
        const byte = bytes[i];
        if (typeof byte !== 'number') {
            throw new Error('Failed to generate random byte for UUID');
        }
        n = n * 256n + BigInt(byte);
    }

    // Ensure fixed length: for 12 bytes in base62, pad result to 17 characters
    // (since 62^17 > 2^(12*8) > 62^16)
    let b62 = '';
    let temp = n;
    for (let i = 0; i < 17; i++) {
        const r = Number(temp % 62n);
        b62 = BASE62_CHARS[r] + b62;
        temp = temp / 62n;
    }

    return prefix + b62;
}