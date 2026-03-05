const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateUUID(prefix = '') {
    const bytes = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
    }

    let n = 0n;
    for (let i = 0; i < 12; i++) {
        n = n * 256n + BigInt(bytes[i]);
    }

    let b62 = '';
    while (n > 0n) {
        const r = Number(n % 62n);
        b62 = BASE62_CHARS[r] + b62;
        n = n / 62n;
    }

    return prefix + b62;
}