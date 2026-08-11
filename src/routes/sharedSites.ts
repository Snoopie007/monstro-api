import { and, asc, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import {
  locations,
  websiteSiteDomains,
  websiteSiteRevisions,
  websiteSiteLocations,
  websiteSites,
} from "@subtrees/schemas";

class SiteEditorError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 502 | 503,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

class VercelApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const createBody = t.Object({
  locationId: t.String({ minLength: 1 }),
  slug: t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  plan: t.Union([t.Literal("growth"), t.Literal("scale")]),
  schemaVersion: t.Integer({ minimum: 1 }),
  config: t.Record(t.String(), t.Unknown()),
});
const configBody = t.Object({
  expectedRevisionId: t.String({ minLength: 1 }),
  schemaVersion: t.Integer({ minimum: 1 }),
  config: t.Record(t.String(), t.Unknown()),
  slug: t.Optional(t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" })),
});

const publishBody = t.Object({
  expectedRevisionId: t.String({ minLength: 1 }),
});
const domainBody = t.Object({
  hostname: t.String({ minLength: 1, maxLength: 253 }),
});

type DnsRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

type VercelProjectDomain = {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: Array<{
    type?: string;
    domain?: string;
    value?: string;
  }>;
};

type VercelDomainConfig = {
  misconfigured: boolean;
  recommendedIPv4?: Array<{ rank: number; value: string[] }>;
  recommendedCNAME?: Array<{ rank: number; value: string }>;
};

function normalizeHostname(value: string) {
  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  const labels = hostname.split(".");
  const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    /^[\d.]+$/.test(hostname) ||
    labels.some((label) => !validLabel.test(label))
  ) {
    throw new SiteEditorError(400, "INVALID_DOMAIN", "Enter a valid domain without https:// or a path");
  }
  return hostname;
}

function vercelSettings() {
  const token = Bun.env.VERCEL_TOKEN?.trim();
  const projectId = Bun.env.VERCEL_SITES_PROJECT_ID?.trim();
  if (!token || !projectId) {
    throw new SiteEditorError(
      503,
      "VERCEL_NOT_CONFIGURED",
      "Vercel domain management is not configured",
    );
  }
  return {
    token,
    projectId,
    teamId: Bun.env.VERCEL_TEAM_ID?.trim() || null,
  };
}

async function vercelRequest<T>(
  settings: ReturnType<typeof vercelSettings>,
  path: string,
  init?: RequestInit,
) {
  const url = new URL(path, "https://api.vercel.com");
  if (settings.teamId) url.searchParams.set("teamId", settings.teamId);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${settings.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new VercelApiError(
      response.status,
      payload?.error?.message ?? `Vercel returned ${response.status}`,
    );
  }
  return payload as T;
}

function vercelFailure(error: unknown): never {
  if (error instanceof VercelApiError) {
    throw new SiteEditorError(
      error.status === 400 || error.status === 409 ? 409 : 502,
      "VERCEL_DOMAIN_ERROR",
      error.message,
    );
  }
  throw error;
}

function topRank<T extends { rank: number }>(values: T[] | undefined) {
  if (!values?.length) return [];
  const rank = Math.min(...values.map((value) => value.rank));
  return values.filter((value) => value.rank === rank);
}

function dnsRecords(
  hostname: string,
  domain: VercelProjectDomain,
  config: VercelDomainConfig,
) {
  const records: DnsRecord[] = [];
  for (const record of domain.verification ?? []) {
    if (
      (record.type === "A" || record.type === "CNAME" || record.type === "TXT") &&
      record.domain &&
      record.value
    ) {
      records.push({ type: record.type, name: record.domain, value: record.value });
    }
  }
  if (hostname === domain.apexName) {
    for (const recommendation of topRank(config.recommendedIPv4)) {
      for (const value of recommendation.value) {
        records.push({ type: "A", name: "@", value });
      }
    }
  } else {
    const name = hostname.endsWith(`.${domain.apexName}`)
      ? hostname.slice(0, -(domain.apexName.length + 1))
      : hostname;
    for (const recommendation of topRank(config.recommendedCNAME)) {
      records.push({ type: "CNAME", name, value: recommendation.value });
    }
  }
  return [...new Map(records.map((record) => [
    `${record.type}:${record.name}:${record.value}`,
    record,
  ])).values()];
}

function storedDnsRecords(value: Record<string, unknown>) {
  if (!Array.isArray(value.dnsRecords)) return [];
  return value.dnsRecords.filter((record): record is DnsRecord => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const candidate = record as Record<string, unknown>;
    return (
      (candidate.type === "A" || candidate.type === "CNAME" || candidate.type === "TXT") &&
      typeof candidate.name === "string" &&
      typeof candidate.value === "string"
    );
  });
}

function domainResponse(domain: {
  id: string;
  hostname: string;
  status: string;
  verificationData: Record<string, unknown>;
  verifiedAt: Date | null;
}) {
  return {
    id: domain.id,
    hostname: domain.hostname,
    status: domain.status,
    source: domain.verificationData.source === "wildcard" ? "wildcard" : "custom",
    misconfigured: typeof domain.verificationData.misconfigured === "boolean"
      ? domain.verificationData.misconfigured
      : null,
    dnsRecords: storedDnsRecords(domain.verificationData),
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
  };
}

function actorId(headers: Record<string, string | undefined>) {
  return headers["x-monstro-actor-id"]?.trim() || "admin";
}

function handleError(error: unknown, set: { status?: number | string }) {
  if (error instanceof SiteEditorError) {
    set.status = error.status;
    return { code: error.code, message: error.message };
  }
  throw error;
}

async function createSite(
  body: typeof createBody.static,
  createdBy: string,
) {
  const [location] = await db
    .select({ id: locations.id, vendorId: locations.vendorId })
    .from(locations)
    .where(eq(locations.id, body.locationId))
    .limit(1);
  if (!location) throw new SiteEditorError(404, "LOCATION_NOT_FOUND", "Location not found");

  const [existing] = await db
    .select({ id: websiteSites.id })
    .from(websiteSites)
    .where(and(eq(websiteSites.vendorId, location.vendorId), eq(websiteSites.slug, body.slug)))
    .limit(1);
  if (existing) throw new SiteEditorError(409, "SITE_EXISTS", "A shared site with this slug already exists");

  const siteId = await db.transaction(async (tx) => {
    const [site] = await tx
      .insert(websiteSites)
      .values({
        vendorId: location.vendorId,
        slug: body.slug,
        plan: body.plan,
        status: "draft",
        createdBy,
      })
      .returning({ id: websiteSites.id });
    if (!site) throw new Error("Failed to create shared site");

    await tx.insert(websiteSiteLocations).values({
      siteId: site.id,
      locationId: location.id,
      isPrimary: true,
      displayOrder: 0,
    });
    await tx.insert(websiteSiteRevisions).values({
      siteId: site.id,
      revisionNumber: 1,
      schemaVersion: body.schemaVersion,
      status: "draft",
      config: body.config,
      createdBy,
    });

    const baseDomain = Bun.env.SHARED_SITES_BASE_DOMAIN?.trim().toLowerCase().replace(/^\\.+|\\.+$/g, "");
    if (baseDomain) {
      await tx.insert(websiteSiteDomains).values({
        siteId: site.id,
        hostname: `${body.slug}.${baseDomain}`,
        status: "verified",
        verificationData: { source: "wildcard" },
        verifiedAt: new Date(),
      });
    }
    return site.id;
  });

  return editorState(siteId);
}

async function getSite(siteId: string) {
  const [site] = await db
    .select({
      id: websiteSites.id,
      slug: websiteSites.slug,
      plan: websiteSites.plan,
      status: websiteSites.status,
      publishedRevisionId: websiteSites.publishedRevisionId,
    })
    .from(websiteSites)
    .where(eq(websiteSites.id, siteId))
    .limit(1);
  if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");
  return site;
}

async function editorState(siteId: string) {
  const site = await getSite(siteId);
  const [draft] = await db
    .select({
      id: websiteSiteRevisions.id,
      schemaVersion: websiteSiteRevisions.schemaVersion,
      config: websiteSiteRevisions.config,
      createdAt: websiteSiteRevisions.created,
    })
    .from(websiteSiteRevisions)
    .where(and(
      eq(websiteSiteRevisions.siteId, siteId),
      eq(websiteSiteRevisions.status, "draft"),
    ))
    .orderBy(desc(websiteSiteRevisions.revisionNumber))
    .limit(1);

  const revision = draft ?? (site.publishedRevisionId
    ? (await db
      .select({
        id: websiteSiteRevisions.id,
        schemaVersion: websiteSiteRevisions.schemaVersion,
        config: websiteSiteRevisions.config,
        createdAt: websiteSiteRevisions.created,
      })
      .from(websiteSiteRevisions)
      .where(eq(websiteSiteRevisions.id, site.publishedRevisionId))
      .limit(1))[0]
    : null);
  if (!revision) throw new SiteEditorError(409, "SITE_HAS_NO_REVISION", "Site has no editable revision");

  const domains = await db
    .select({ hostname: websiteSiteDomains.hostname })
    .from(websiteSiteDomains)
    .where(and(
      eq(websiteSiteDomains.siteId, siteId),
      eq(websiteSiteDomains.status, "verified"),
    ))
    .orderBy(asc(websiteSiteDomains.created));

  return {
    siteId: site.id,
    slug: site.slug,
    plan: site.plan,
    status: site.status,
    revisionId: revision.id,
    publishedRevisionId: site.publishedRevisionId,
    hasDraft: Boolean(draft),
    schemaVersion: revision.schemaVersion,
    config: revision.config,
    domain: domains[0]?.hostname ?? null,
    domains: domains.map(({ hostname }) => hostname),
    updatedAt: revision.createdAt.toISOString(),
  };
}

async function saveDraft(
  siteId: string,
  body: typeof configBody.static,
  createdBy: string,
) {
  await db.transaction(async (tx) => {
    const [site] = await tx
      .select({ id: websiteSites.id, publishedRevisionId: websiteSites.publishedRevisionId })
      .from(websiteSites)
      .where(eq(websiteSites.id, siteId))
      .limit(1)
      .for("update");
    if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");

    const [draft] = await tx
      .select({ id: websiteSiteRevisions.id })
      .from(websiteSiteRevisions)
      .where(and(
        eq(websiteSiteRevisions.siteId, siteId),
        eq(websiteSiteRevisions.status, "draft"),
      ))
      .limit(1);
    const currentRevisionId = draft?.id ?? site.publishedRevisionId;
    if (currentRevisionId !== body.expectedRevisionId) {
      throw new SiteEditorError(409, "STALE_REVISION", "The site changed since it was loaded");
    }

    if (draft) {
      await tx
        .update(websiteSiteRevisions)
        .set({ status: "archived" })
        .where(eq(websiteSiteRevisions.id, draft.id));
    }
    const [latest] = await tx
      .select({ revisionNumber: websiteSiteRevisions.revisionNumber })
      .from(websiteSiteRevisions)
      .where(eq(websiteSiteRevisions.siteId, siteId))
      .orderBy(desc(websiteSiteRevisions.revisionNumber))
      .limit(1);
    const [revision] = await tx
      .insert(websiteSiteRevisions)
      .values({
        siteId,
        revisionNumber: (latest?.revisionNumber ?? 0) + 1,
        schemaVersion: body.schemaVersion,
        status: "draft",
        config: body.config,
        baseRevisionId: currentRevisionId,
        createdBy,
      })
      .returning({ id: websiteSiteRevisions.id });
    if (!revision) throw new Error("Failed to create draft revision");

    await tx
      .update(websiteSites)
      .set({ ...(body.slug ? { slug: body.slug } : {}), updated: new Date() })
      .where(eq(websiteSites.id, siteId));
  });

  return editorState(siteId);
}

async function publishDraft(siteId: string, expectedRevisionId: string) {
  const domains = await db.transaction(async (tx) => {
    const [site] = await tx
      .select({ id: websiteSites.id, publishedRevisionId: websiteSites.publishedRevisionId })
      .from(websiteSites)
      .where(eq(websiteSites.id, siteId))
      .limit(1)
      .for("update");
    if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");

    const [draft] = await tx
      .select({ id: websiteSiteRevisions.id })
      .from(websiteSiteRevisions)
      .where(and(
        eq(websiteSiteRevisions.siteId, siteId),
        eq(websiteSiteRevisions.status, "draft"),
      ))
      .limit(1);
    if (!draft && site.publishedRevisionId !== expectedRevisionId) {
      throw new SiteEditorError(409, "NO_DRAFT", "There is no draft to publish");
    }
    if (draft && draft.id !== expectedRevisionId) {
      throw new SiteEditorError(409, "STALE_REVISION", "The site changed since it was loaded");
    }

    if (draft) {
      if (site.publishedRevisionId) {
        await tx
          .update(websiteSiteRevisions)
          .set({ status: "archived" })
          .where(eq(websiteSiteRevisions.id, site.publishedRevisionId));
      }
      await tx
        .update(websiteSiteRevisions)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(websiteSiteRevisions.id, draft.id));
      await tx
        .update(websiteSites)
        .set({ status: "active", publishedRevisionId: draft.id, updated: new Date() })
        .where(eq(websiteSites.id, siteId));
    }

    return tx
      .select({ hostname: websiteSiteDomains.hostname })
      .from(websiteSiteDomains)
      .where(and(
        eq(websiteSiteDomains.siteId, siteId),
        eq(websiteSiteDomains.status, "verified"),
      ));
  });

  return {
    siteId,
    publishedRevisionId: expectedRevisionId,
    domains: domains.map(({ hostname }) => hostname),
  };
}
async function listDomains(siteId: string) {
  await getSite(siteId);
  const domains = await db
    .select({
      id: websiteSiteDomains.id,
      hostname: websiteSiteDomains.hostname,
      status: websiteSiteDomains.status,
      verificationData: websiteSiteDomains.verificationData,
      verifiedAt: websiteSiteDomains.verifiedAt,
    })
    .from(websiteSiteDomains)
    .where(eq(websiteSiteDomains.siteId, siteId))
    .orderBy(asc(websiteSiteDomains.created));
  return { domains: domains.map(domainResponse) };
}

async function getVercelDomain(
  settings: ReturnType<typeof vercelSettings>,
  hostname: string,
) {
  try {
    return await vercelRequest<VercelProjectDomain>(
      settings,
      `/v9/projects/${encodeURIComponent(settings.projectId)}/domains/${encodeURIComponent(hostname)}`,
    );
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) return null;
    throw error;
  }
}

function domainState(
  hostname: string,
  domain: VercelProjectDomain,
  config: VercelDomainConfig,
  previousVerifiedAt: Date | null,
) {
  const status = domain.verified && !config.misconfigured ? "verified" : "pending";
  const verifiedAt = status === "verified" ? previousVerifiedAt ?? new Date() : null;
  const verificationData = {
    source: "custom",
    provider: "vercel",
    apexName: domain.apexName,
    misconfigured: config.misconfigured,
    dnsRecords: dnsRecords(hostname, domain, config),
  };
  return { status, verifiedAt, verificationData };
}

async function vercelDomainConfig(
  settings: ReturnType<typeof vercelSettings>,
  hostname: string,
) {
  return vercelRequest<VercelDomainConfig>(
    settings,
    `/v6/domains/${encodeURIComponent(hostname)}/config?projectIdOrName=${encodeURIComponent(settings.projectId)}`,
  );
}

async function addDomain(siteId: string, value: string) {
  const settings = vercelSettings();
  await getSite(siteId);
  const hostname = normalizeHostname(value);
  const [existing] = await db
    .select({
      id: websiteSiteDomains.id,
      siteId: websiteSiteDomains.siteId,
      status: websiteSiteDomains.status,
      verificationData: websiteSiteDomains.verificationData,
      verifiedAt: websiteSiteDomains.verifiedAt,
    })
    .from(websiteSiteDomains)
    .where(eq(websiteSiteDomains.hostname, hostname))
    .limit(1);
  if (existing && existing.siteId !== siteId) {
    throw new SiteEditorError(409, "DOMAIN_IN_USE", "This domain is already assigned to another site");
  }
  if (existing?.verificationData.source === "wildcard") {
    throw new SiteEditorError(409, "DOMAIN_IN_USE", "This managed site domain cannot be added as a custom domain");
  }

  let domainId = existing?.id;
  if (!domainId) {
    try {
      const [created] = await db
        .insert(websiteSiteDomains)
        .values({
          siteId,
          hostname,
          status: "pending",
          verificationData: { source: "custom", provider: "vercel" },
        })
        .returning({ id: websiteSiteDomains.id });
      if (!created) throw new Error("Failed to save custom domain");
      domainId = created.id;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new SiteEditorError(409, "DOMAIN_IN_USE", "This domain is already assigned");
      }
      throw error;
    }
  }

  try {
    const domain = await getVercelDomain(settings, hostname) ??
      await vercelRequest<VercelProjectDomain>(
        settings,
        `/v10/projects/${encodeURIComponent(settings.projectId)}/domains`,
        { method: "POST", body: JSON.stringify({ name: hostname }) },
      );
    const config = await vercelDomainConfig(settings, hostname);
    const state = domainState(hostname, domain, config, existing?.verifiedAt ?? null);
    await db
      .update(websiteSiteDomains)
      .set({ ...state, updated: new Date() })
      .where(eq(websiteSiteDomains.id, domainId));
    return domainResponse({
      id: domainId,
      hostname,
      ...state,
    });
  } catch (error) {
    return vercelFailure(error);
  }
}

async function verifyDomain(siteId: string, value: string) {
  const settings = vercelSettings();
  await getSite(siteId);
  const hostname = normalizeHostname(value);
  const [existing] = await db
    .select({
      id: websiteSiteDomains.id,
      hostname: websiteSiteDomains.hostname,
      status: websiteSiteDomains.status,
      verificationData: websiteSiteDomains.verificationData,
      verifiedAt: websiteSiteDomains.verifiedAt,
    })
    .from(websiteSiteDomains)
    .where(and(
      eq(websiteSiteDomains.siteId, siteId),
      eq(websiteSiteDomains.hostname, hostname),
    ))
    .limit(1);
  if (!existing || existing.verificationData.source === "wildcard") {
    throw new SiteEditorError(404, "DOMAIN_NOT_FOUND", "Custom domain not found");
  }

  try {
    const domain = await vercelRequest<VercelProjectDomain>(
      settings,
      `/v9/projects/${encodeURIComponent(settings.projectId)}/domains/${encodeURIComponent(hostname)}/verify`,
      { method: "POST" },
    );
    const config = await vercelDomainConfig(settings, hostname);
    const state = domainState(hostname, domain, config, existing.verifiedAt);
    await db
      .update(websiteSiteDomains)
      .set({ ...state, updated: new Date() })
      .where(eq(websiteSiteDomains.id, existing.id));
    return domainResponse({ ...existing, ...state });
  } catch (error) {
    return vercelFailure(error);
  }
}


export const sharedSiteAdminRoutes = new Elysia({ prefix: "/shared-sites" })
  .onBeforeHandle(({ headers, set }) => {
    const token = Bun.env.MONSTRO_SITES_SERVICE_TOKEN;
    if (!token) {
      set.status = 503;
      return { code: "SERVICE_UNAVAILABLE", message: "Site service authentication is not configured" };
    }
    if (headers.authorization !== `Bearer ${token}`) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: "Unauthorized" };
    }
  })
  .post("/", async ({ body, headers, set }) => {
    try {
      return await createSite(body, actorId(headers));
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: createBody })
  .get("/:siteId/editor", async ({ params, set }) => {
    try {
      return await editorState(params.siteId);
    } catch (error) {
      return handleError(error, set);
    }
  })
  .get("/:siteId/domains", async ({ params, set }) => {
    try {
      return await listDomains(params.siteId);
    } catch (error) {
      return handleError(error, set);
    }
  })
  .post("/:siteId/domains", async ({ params, body, set }) => {
    try {
      return { domain: await addDomain(params.siteId, body.hostname) };
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: domainBody })
  .post("/:siteId/domains/:hostname/verify", async ({ params, set }) => {
    try {
      return { domain: await verifyDomain(params.siteId, params.hostname) };
    } catch (error) {
      return handleError(error, set);
    }
  })
  .delete("/:siteId", async ({ params }) => {
    await db.delete(websiteSites).where(eq(websiteSites.id, params.siteId));
    return { deleted: true };
  })
  .put("/:siteId/draft", async ({ params, body, headers, set }) => {
    try {
      return await saveDraft(params.siteId, body, actorId(headers));
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: configBody })
  .post("/:siteId/publish", async ({ params, body, set }) => {
    try {
      return await publishDraft(params.siteId, body.expectedRevisionId);
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: publishBody });
