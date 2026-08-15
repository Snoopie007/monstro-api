import { db } from "@/db/db";
import {
    locations,
    websiteSiteDomains,
    websiteSites,
} from "@subtrees/schemas";
import { and, eq, isNotNull } from "drizzle-orm";

const NEGATIVE_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_AGE_MS = 15 * 60 * 1000;

let cachedOrigins: string[] | null = null;
let cachedAt = 0;
const negativeCache = new Map<string, number>();

function parseEnvOrigins(): string[] {
    return (Bun.env.TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

export function getStaticOrigins(baseURL: string): string[] {
    const origins = [
        "http://localhost:3000",
        ...parseEnvOrigins(),
    ];

    try {
        origins.push(new URL(baseURL).origin);
    } catch {
        // ignore invalid baseURL during origin parsing
    }

    return [...new Set(origins)];
}

function toOrigin(website: string | null): string | null {
    if (!website?.trim()) return null;

    try {
        const url = website.startsWith("http") ? website : `https://${website}`;
        return new URL(url).origin;
    } catch {
        return null;
    }
}

async function loadOriginsFromDb(): Promise<string[]> {
    const [legacyRows, siteRows] = await Promise.all([
        db
            .select({ website: locations.website })
            .from(locations)
            .where(isNotNull(locations.website)),
        db
            .select({ hostname: websiteSiteDomains.hostname })
            .from(websiteSiteDomains)
            .innerJoin(websiteSites, eq(websiteSiteDomains.siteId, websiteSites.id))
            .where(and(
                eq(websiteSiteDomains.status, "verified"),
                isNotNull(websiteSiteDomains.verifiedAt),
                eq(websiteSites.status, "active"),
            )),
    ]);

    const legacyOrigins = legacyRows
        .map((row) => toOrigin(row.website))
        .filter((origin): origin is string => origin !== null);
    const siteOrigins = siteRows
        .map((row) => toOrigin(`https://${row.hostname}`))
        .filter((origin): origin is string => origin !== null);

    return [...new Set([...legacyOrigins, ...siteOrigins])];
}

async function refreshOrigins(staticOrigins: string[]): Promise<string[]> {
    const fromDb = await loadOriginsFromDb();
    cachedOrigins = [...new Set([...staticOrigins, ...fromDb])];
    cachedAt = Date.now();
    return cachedOrigins;
}

function isCacheStale(): boolean {
    return cachedOrigins === null || Date.now() - cachedAt > MAX_CACHE_AGE_MS;
}

function isNegativeCached(origin: string): boolean {
    const expiresAt = negativeCache.get(origin);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
        negativeCache.delete(origin);
        return false;
    }

    return true;
}

function markNegative(origin: string) {
    negativeCache.set(origin, Date.now() + NEGATIVE_CACHE_TTL_MS);
}

export function invalidateTrustedOriginsCache() {
    cachedOrigins = null;
    cachedAt = 0;
    negativeCache.clear();
}

export async function resolveTrustedOrigins(
    baseURL: string,
    request?: Request,
): Promise<string[]> {
    const staticOrigins = getStaticOrigins(baseURL);

    if (!request) {
        return staticOrigins;
    }
    const origin = request.headers.get("origin");
    if (Bun.env.BUN_ENV !== "production" && origin) {
        try {
            const { hostname, protocol } = new URL(origin);
            if (protocol === "http:" && (hostname === "localhost" || hostname.endsWith(".localhost"))) {
                return [...new Set([...staticOrigins, origin])];
            }
        } catch {
            // Let Better Auth reject malformed origins.
        }
    }

    if (isCacheStale()) {
        return refreshOrigins(staticOrigins);
    }

    const list = cachedOrigins ?? await refreshOrigins(staticOrigins);

    if (!origin || list.includes(origin)) {
        return list;
    }

    if (isNegativeCached(origin)) {
        return list;
    }

    const refreshed = await refreshOrigins(staticOrigins);
    if (!refreshed.includes(origin)) {
        markNegative(origin);
    }

    return refreshed;
}
