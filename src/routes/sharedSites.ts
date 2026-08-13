import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import {
  locations,
  websiteBlocks,
  websitePages,
  websiteSiteDomains,
  websiteSiteDrafts,
  websiteSiteRevisions,
  websiteSiteLocations,
  websiteSites,
  websiteTemplates,
  websiteTemplateVersions,
} from "@subtrees/schemas";
import {
  assembleSiteConfig,
  draftToken,
  materializeSiteTemplate,
  splitSiteConfig,
  type StoredBlockRow,
  type StoredPageRow,
} from "@/libs/siteDraftConfig";
import {
  normalizeSitePageTemplateV2,
  SitePageTemplateSchema,
} from "@subtrees/site-config.js";

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
  businessName: t.String({ minLength: 1, maxLength: 200 }),
  themePrimaryColor: t.Optional(t.String({ pattern: "^#[0-9a-fA-F]{6}$" })),
});
const configBody = t.Object({
  expectedRevisionId: t.String({ minLength: 1 }),
  schemaVersion: t.Integer({ minimum: 1 }),
  config: t.Record(t.String(), t.Unknown()),
  slug: t.Optional(t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" })),
  pageTemplateSources: t.Optional(t.Record(t.String(), t.String({ minLength: 1 }))),
});
const migrationBody = t.Object({
  sourceKey: t.String({ minLength: 1, maxLength: 200 }),
  locationId: t.String({ minLength: 1 }),
  slug: t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  plan: t.Union([t.Literal("growth"), t.Literal("scale")]),
  config: t.Record(t.String(), t.Unknown()),
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
  isCanonical: boolean;
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
    isCanonical: domain.isCanonical,
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

type SiteTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function activeSiteTemplate(plan: "growth" | "scale") {
  const [template] = await db
    .select({
      versionId: websiteTemplateVersions.id,
      payload: websiteTemplateVersions.payload,
    })
    .from(websiteTemplates)
    .innerJoin(
      websiteTemplateVersions,
      eq(websiteTemplateVersions.templateId, websiteTemplates.id),
    )
    .where(and(
      eq(websiteTemplates.kind, "site"),
      eq(websiteTemplates.plan, plan),
      eq(websiteTemplates.status, "active"),
      sql`${websiteTemplates.vendorId} is null`,
    ))
    .orderBy(desc(websiteTemplateVersions.versionNumber))
    .limit(1);
  if (!template) {
    throw new SiteEditorError(
      503,
      "SITE_TEMPLATE_MISSING",
      `No active ${plan} site template is configured`,
    );
  }
  return template;
}

async function listPageTemplates() {
  const rows = await db
    .select({
      templateId: websiteTemplates.id,
      versionId: websiteTemplateVersions.id,
      versionNumber: websiteTemplateVersions.versionNumber,
      schemaVersion: websiteTemplateVersions.schemaVersion,
      name: websiteTemplates.name,
      description: websiteTemplates.description,
      payload: websiteTemplateVersions.payload,
    })
    .from(websiteTemplates)
    .innerJoin(
      websiteTemplateVersions,
      eq(websiteTemplateVersions.templateId, websiteTemplates.id),
    )
    .where(and(
      eq(websiteTemplates.kind, "page"),
      eq(websiteTemplates.status, "active"),
      sql`${websiteTemplates.vendorId} is null`,
    ))
    .orderBy(asc(websiteTemplates.name), desc(websiteTemplateVersions.versionNumber));
  const latest = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    if (!latest.has(row.templateId)) latest.set(row.templateId, row);
  }
  return {
    templates: [...latest.values()].map((row) => {
      const payload = SitePageTemplateSchema.parse(normalizeSitePageTemplateV2(row.payload));
      if (payload.schemaVersion !== row.schemaVersion) {
        throw new Error(`Page template schema mismatch: ${row.versionId}`);
      }
      return {
        templateId: row.templateId,
        versionId: row.versionId,
        name: row.name,
        description: row.description,
      };
    }),
  };
}

async function resolvePageTemplate(versionId: string) {
  const [row] = await db
    .select({
      templateId: websiteTemplates.id,
      versionId: websiteTemplateVersions.id,
      schemaVersion: websiteTemplateVersions.schemaVersion,
      name: websiteTemplates.name,
      description: websiteTemplates.description,
      payload: websiteTemplateVersions.payload,
    })
    .from(websiteTemplateVersions)
    .innerJoin(
      websiteTemplates,
      eq(websiteTemplates.id, websiteTemplateVersions.templateId),
    )
    .where(and(
      eq(websiteTemplateVersions.id, versionId),
      eq(websiteTemplates.kind, "page"),
      eq(websiteTemplates.status, "active"),
      sql`${websiteTemplates.vendorId} is null`,
    ))
    .limit(1);
  if (!row) {
    throw new SiteEditorError(404, "PAGE_TEMPLATE_NOT_FOUND", "Page template not found");
  }
  const payload = SitePageTemplateSchema.parse(normalizeSitePageTemplateV2(row.payload));
  if (payload.schemaVersion !== row.schemaVersion) {
    throw new Error(`Page template schema mismatch: ${row.versionId}`);
  }
  return { ...row, payload };
}

type SiteRowTemplateSources = {
  defaultTemplateVersionId?: string;
  pageTemplateVersionIds?: ReadonlyMap<string, string>;
};


async function persistSiteRows(
  tx: SiteTransaction,
  siteId: string,
  parsed: ReturnType<typeof splitSiteConfig>,
  sources: SiteRowTemplateSources = {},
) {
  const sourceForPage = (pageKey: string) =>
    sources.pageTemplateVersionIds?.get(pageKey)
    ?? sources.defaultTemplateVersionId
    ?? null;
  const pageKeys = parsed.pages.map((page) => page.pageKey);
  await tx
    .delete(websitePages)
    .where(and(
      eq(websitePages.siteId, siteId),
      notInArray(websitePages.pageKey, pageKeys),
    ));
  await tx
    .update(websitePages)
    .set({
      path: sql`${websitePages.path} || '#staging'`,
      position: sql`${websitePages.position} + 100000`,
    })
    .where(eq(websitePages.siteId, siteId));

  const storedPages = await tx
    .insert(websitePages)
    .values(parsed.pages.map((page) => ({
      siteId,
      pageKey: page.pageKey,
      path: page.path,
      kind: page.kind,
      position: page.position,
      visible: page.visible,
      metadata: page.metadata,
      sourceTemplateVersionId: sourceForPage(page.pageKey),
    })))
    .onConflictDoUpdate({
      target: [websitePages.siteId, websitePages.pageKey],
      set: {
        path: sql`excluded.path`,
        kind: sql`excluded.kind`,
        position: sql`excluded.position`,
        visible: sql`excluded.visible`,
        metadata: sql`excluded.metadata`,
        sourceTemplateVersionId: sql`coalesce(${websitePages.sourceTemplateVersionId}, excluded.source_template_version_id)`,
        updated: sql`now()`,
      },
    })
    .returning({ id: websitePages.id, pageKey: websitePages.pageKey });
  const pageIds = new Map(storedPages.map((page) => [page.pageKey, page.id]));

  for (const page of parsed.pages) {
    const pageId = pageIds.get(page.pageKey);
    if (!pageId) throw new Error(`Failed to persist page ${page.pageKey}`);
    const blockKeys = page.blocks.map((block) => block.blockKey);
    if (blockKeys.length === 0) {
      await tx.delete(websiteBlocks).where(eq(websiteBlocks.pageId, pageId));
    } else {
      await tx
        .delete(websiteBlocks)
        .where(and(
          eq(websiteBlocks.pageId, pageId),
          notInArray(websiteBlocks.blockKey, blockKeys),
        ));
      await tx
        .update(websiteBlocks)
        .set({ position: sql`${websiteBlocks.position} + 100000` })
        .where(eq(websiteBlocks.pageId, pageId));
    }
  }

  const blocks = parsed.pages.flatMap((page) => {
    const pageId = pageIds.get(page.pageKey);
    if (!pageId) throw new Error(`Failed to persist blocks for ${page.pageKey}`);
    return page.blocks.map((block) => ({
      pageId,
      blockKey: block.blockKey,
      type: block.type,
      position: block.position,
      visible: block.visible,
      props: block.props,
      sourceTemplateVersionId: sourceForPage(page.pageKey),
    }));
  });
  if (blocks.length > 0) {
    await tx
      .insert(websiteBlocks)
      .values(blocks)
      .onConflictDoUpdate({
        target: [websiteBlocks.pageId, websiteBlocks.blockKey],
        set: {
          type: sql`excluded.type`,
          position: sql`excluded.position`,
          visible: sql`excluded.visible`,
          props: sql`excluded.props`,
          sourceTemplateVersionId: sql`coalesce(${websiteBlocks.sourceTemplateVersionId}, excluded.source_template_version_id)`,
          updated: sql`now()`,
        },
      });
  }
}

async function readSiteConfig(
  tx: SiteTransaction,
  siteId: string,
  draft: {
    schemaVersion: number;
    settings: Record<string, unknown>;
  },
) {
  const pages: StoredPageRow[] = await tx
    .select({
      id: websitePages.id,
      pageKey: websitePages.pageKey,
      path: websitePages.path,
      kind: websitePages.kind,
      position: websitePages.position,
      visible: websitePages.visible,
      metadata: websitePages.metadata,
    })
    .from(websitePages)
    .where(eq(websitePages.siteId, siteId))
    .orderBy(asc(websitePages.position)) as StoredPageRow[];
  const pageIds = pages.map((page) => page.id);
  const blocks: StoredBlockRow[] = pageIds.length === 0
    ? []
    : await tx
      .select({
        pageId: websiteBlocks.pageId,
        blockKey: websiteBlocks.blockKey,
        type: websiteBlocks.type,
        position: websiteBlocks.position,
        visible: websiteBlocks.visible,
        props: websiteBlocks.props,
      })
      .from(websiteBlocks)
      .where(inArray(websiteBlocks.pageId, pageIds))
      .orderBy(asc(websiteBlocks.pageId), asc(websiteBlocks.position)) as StoredBlockRow[];
  return assembleSiteConfig({
    schemaVersion: draft.schemaVersion,
    settings: draft.settings,
    pages,
    blocks,
  });
}

function businessName(settings: Record<string, unknown>, fallback: string) {
  const business = settings.business;
  if (
    business &&
    typeof business === "object" &&
    !Array.isArray(business) &&
    typeof (business as Record<string, unknown>).name === "string"
  ) {
    return (business as Record<string, unknown>).name as string;
  }
  return fallback;
}

async function listSites() {
  const [sites, domains] = await Promise.all([
    db
      .select({
        id: websiteSites.id,
        slug: websiteSites.slug,
        plan: websiteSites.plan,
        status: websiteSites.status,
        publishedRevisionId: websiteSites.publishedRevisionId,
        createdAt: websiteSites.created,
        updatedAt: websiteSiteDrafts.updated,
        settings: websiteSiteDrafts.settings,
        draftVersion: websiteSiteDrafts.version,
        isDirty: websiteSiteDrafts.isDirty,
        locationId: websiteSiteLocations.locationId,
      })
      .from(websiteSites)
      .innerJoin(
        websiteSiteDrafts,
        eq(websiteSiteDrafts.siteId, websiteSites.id),
      )
      .leftJoin(
        websiteSiteLocations,
        and(
          eq(websiteSiteLocations.siteId, websiteSites.id),
          eq(websiteSiteLocations.isPrimary, true),
        ),
      )
      .orderBy(desc(websiteSites.updated)),
    db
      .select({
        siteId: websiteSiteDomains.siteId,
        hostname: websiteSiteDomains.hostname,
        isCanonical: websiteSiteDomains.isCanonical,
      })
      .from(websiteSiteDomains)
      .where(eq(websiteSiteDomains.status, "verified"))
      .orderBy(desc(websiteSiteDomains.isCanonical), asc(websiteSiteDomains.created)),
  ]);
  const domainBySite = new Map<string, string>();
  for (const domain of domains) {
    if (!domainBySite.has(domain.siteId)) {
      domainBySite.set(domain.siteId, domain.hostname);
    }
  }
  return {
    sites: sites.map((site) => ({
      id: site.id,
      businessName: businessName(site.settings, site.slug),
      slug: site.slug,
      plan: site.plan,
      status: site.status,
      locationId: site.locationId ?? null,
      publishedRevisionId: site.publishedRevisionId,
      draftRevisionId: site.isDirty
        ? draftToken(site.id, site.draftVersion)
        : site.publishedRevisionId ?? draftToken(site.id, site.draftVersion),
      hasDraft: site.isDirty,
      domain: domainBySite.get(site.id) ?? null,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
    })),
  };
}

async function createSite(
  body: typeof createBody.static,
  createdBy: string,
) {
  const [location] = await db
    .select({
      id: locations.id,
      vendorId: locations.vendorId,
      city: locations.city,
    })
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

  const template = await activeSiteTemplate(body.plan);
  const config = materializeSiteTemplate(template.payload, {
    businessName: body.businessName,
    businessSlug: body.slug.replaceAll("-", ""),
    city: location.city ?? "your area",
    primaryColor: body.themePrimaryColor,
  });
  const parsed = splitSiteConfig(config);

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
    await tx.insert(websiteSiteDrafts).values({
      siteId: site.id,
      schemaVersion: parsed.schemaVersion,
      settings: parsed.settings,
      version: 1,
      isDirty: true,
      updatedBy: createdBy,
    });
    await persistSiteRows(tx, site.id, parsed, {
      defaultTemplateVersionId: template.versionId,
    });

    const baseDomain = Bun.env.SHARED_SITES_BASE_DOMAIN?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
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
async function migrateSite(
  body: typeof migrationBody.static,
  createdBy: string,
) {
  let parsed: ReturnType<typeof splitSiteConfig>;
  try {
    parsed = splitSiteConfig(body.config);
  } catch (error) {
    throw new SiteEditorError(
      400,
      "SITE_CONFIG_INVALID",
      error instanceof Error ? error.message : "Site config is invalid",
    );
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${body.sourceKey}))`);
    const [location] = await tx
      .select({ id: locations.id, vendorId: locations.vendorId })
      .from(locations)
      .where(eq(locations.id, body.locationId))
      .limit(1);
    if (!location) {
      throw new SiteEditorError(404, "LOCATION_NOT_FOUND", "Location not found");
    }

    const [existing] = await tx
      .select({
        id: websiteSites.id,
        vendorId: websiteSites.vendorId,
        slug: websiteSites.slug,
        plan: websiteSites.plan,
        locationId: websiteSiteLocations.locationId,
      })
      .from(websiteSites)
      .leftJoin(
        websiteSiteLocations,
        and(
          eq(websiteSiteLocations.siteId, websiteSites.id),
          eq(websiteSiteLocations.isPrimary, true),
        ),
      )
      .where(eq(websiteSites.migrationSource, body.sourceKey))
      .limit(1);
    if (existing) {
      if (
        existing.vendorId !== location.vendorId ||
        existing.slug !== body.slug ||
        existing.plan !== body.plan ||
        existing.locationId !== body.locationId
      ) {
        throw new SiteEditorError(
          409,
          "MIGRATION_CONFLICT",
          "Migration source is already linked to a different shared site",
        );
      }
      return { siteId: existing.id, created: false };
    }

    const [slugConflict] = await tx
      .select({ id: websiteSites.id })
      .from(websiteSites)
      .where(and(
        eq(websiteSites.vendorId, location.vendorId),
        eq(websiteSites.slug, body.slug),
      ))
      .limit(1);
    if (slugConflict) {
      throw new SiteEditorError(
        409,
        "MIGRATION_CONFLICT",
        "A different shared site already uses this vendor and slug",
      );
    }

    const [site] = await tx
      .insert(websiteSites)
      .values({
        vendorId: location.vendorId,
        slug: body.slug,
        plan: body.plan,
        status: "draft",
        createdBy,
        migrationSource: body.sourceKey,
      })
      .returning({ id: websiteSites.id });
    if (!site) throw new Error("Failed to create migrated shared site");

    await tx.insert(websiteSiteLocations).values({
      siteId: site.id,
      locationId: location.id,
      isPrimary: true,
      displayOrder: 0,
    });
    await tx.insert(websiteSiteDrafts).values({
      siteId: site.id,
      schemaVersion: parsed.schemaVersion,
      settings: parsed.settings,
      version: 1,
      isDirty: false,
      updatedBy: createdBy,
    });
    await persistSiteRows(tx, site.id, parsed, {});
    const [revision] = await tx
      .insert(websiteSiteRevisions)
      .values({
        siteId: site.id,
        revisionNumber: 1,
        schemaVersion: parsed.schemaVersion,
        status: "published",
        config: body.config,
        createdBy,
        publishedAt: new Date(),
      })
      .returning({ id: websiteSiteRevisions.id });
    if (!revision) throw new Error("Failed to create migrated baseline");
    await tx
      .update(websiteSites)
      .set({
        status: "active",
        publishedRevisionId: revision.id,
        updated: new Date(),
      })
      .where(eq(websiteSites.id, site.id));
    return { siteId: site.id, created: true };
  });

  return result;
}

async function getSite(siteId: string) {
  const [site] = await db
    .select({
      id: websiteSites.id,
      slug: websiteSites.slug,
      plan: websiteSites.plan,
      status: websiteSites.status,
      publishedRevisionId: websiteSites.publishedRevisionId,
      locationId: websiteSiteLocations.locationId,
      createdAt: websiteSites.created,
    })
    .from(websiteSites)
    .leftJoin(
      websiteSiteLocations,
      and(
        eq(websiteSiteLocations.siteId, websiteSites.id),
        eq(websiteSiteLocations.isPrimary, true),
      ),
    )
    .where(eq(websiteSites.id, siteId))
    .limit(1);
  if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");
  return site;
}

async function editorState(siteId: string) {
  const site = await getSite(siteId);
  const state = await db.transaction(async (tx) => {
    const [draft] = await tx
      .select({
        schemaVersion: websiteSiteDrafts.schemaVersion,
        settings: websiteSiteDrafts.settings,
        version: websiteSiteDrafts.version,
        isDirty: websiteSiteDrafts.isDirty,
        updatedAt: websiteSiteDrafts.updated,
      })
      .from(websiteSiteDrafts)
      .where(eq(websiteSiteDrafts.siteId, siteId))
      .limit(1);
    if (!draft) {
      throw new SiteEditorError(
        409,
        "SITE_HAS_NO_DRAFT_SOURCE",
        "Site has no editable relational draft",
      );
    }
    const config = await readSiteConfig(tx, siteId, draft);
    const domains = await tx
      .select({
        hostname: websiteSiteDomains.hostname,
        isCanonical: websiteSiteDomains.isCanonical,
      })
      .from(websiteSiteDomains)
      .where(and(
        eq(websiteSiteDomains.siteId, siteId),
        eq(websiteSiteDomains.status, "verified"),
      ))
      .orderBy(desc(websiteSiteDomains.isCanonical), asc(websiteSiteDomains.created));
    return { draft, config, domains };
  });
  const revisionId = state.draft.isDirty
    ? draftToken(siteId, state.draft.version)
    : site.publishedRevisionId ?? draftToken(siteId, state.draft.version);

  return {
    siteId: site.id,
    businessName: businessName(state.draft.settings, site.slug),
    slug: site.slug,
    plan: site.plan,
    status: site.status,
    locationId: site.locationId ?? null,
    revisionId,
    publishedRevisionId: site.publishedRevisionId,
    hasDraft: state.draft.isDirty,
    schemaVersion: state.draft.schemaVersion,
    config: state.config,
    domain: state.domains[0]?.hostname ?? null,
    domains: state.domains.map(({ hostname }) => hostname),
    createdAt: site.createdAt.toISOString(),
    updatedAt: state.draft.updatedAt.toISOString(),
  };
}

async function validatePageTemplateSources(
  tx: SiteTransaction,
  siteId: string,
  parsed: ReturnType<typeof splitSiteConfig>,
  requested: Record<string, string> | undefined,
) {
  const entries = Object.entries(requested ?? {});
  const sources = new Map(entries);
  if (entries.length === 0) return sources;

  const pages = new Map(parsed.pages.map((page) => [page.pageKey, page]));
  for (const [pageKey] of entries) {
    if (pages.get(pageKey)?.kind !== "sections") {
      throw new SiteEditorError(
        400,
        "PAGE_TEMPLATE_SOURCE_INVALID",
        `Page template source does not match an editable page: ${pageKey}`,
      );
    }
  }

  const existing = await tx
    .select({ pageKey: websitePages.pageKey })
    .from(websitePages)
    .where(eq(websitePages.siteId, siteId));
  const existingKeys = new Set(existing.map((page) => page.pageKey));
  const existingSource = entries.find(([pageKey]) => existingKeys.has(pageKey));
  if (existingSource) {
    throw new SiteEditorError(
      400,
      "PAGE_TEMPLATE_SOURCE_INVALID",
      `Template provenance may only be assigned when adding a page: ${existingSource[0]}`,
    );
  }

  const versionIds = [...new Set(sources.values())];
  const versions = await tx
    .select({
      id: websiteTemplateVersions.id,
      schemaVersion: websiteTemplateVersions.schemaVersion,
      payload: websiteTemplateVersions.payload,
    })
    .from(websiteTemplateVersions)
    .innerJoin(
      websiteTemplates,
      eq(websiteTemplates.id, websiteTemplateVersions.templateId),
    )
    .where(and(
      inArray(websiteTemplateVersions.id, versionIds),
      eq(websiteTemplates.kind, "page"),
      eq(websiteTemplates.status, "active"),
      sql`${websiteTemplates.vendorId} is null`,
    ));
  if (versions.length !== versionIds.length) {
    throw new SiteEditorError(
      400,
      "PAGE_TEMPLATE_SOURCE_INVALID",
      "Page template source is missing, archived, or not a platform template",
    );
  }
  for (const version of versions) {
    const payload = SitePageTemplateSchema.parse(version.payload);
    if (payload.schemaVersion !== version.schemaVersion) {
      throw new SiteEditorError(
        400,
        "PAGE_TEMPLATE_SOURCE_INVALID",
        `Page template schema mismatch: ${version.id}`,
      );
    }
  }
  return sources;
}

async function saveDraft(
  siteId: string,
  body: typeof configBody.static,
  createdBy: string,
) {
  let parsed: ReturnType<typeof splitSiteConfig>;
  try {
    parsed = splitSiteConfig(body.config);
  } catch (error) {
    throw new SiteEditorError(
      400,
      "SITE_CONFIG_INVALID",
      error instanceof Error ? error.message : "Site config is invalid",
    );
  }
  if (parsed.schemaVersion !== body.schemaVersion) {
    throw new SiteEditorError(
      400,
      "SITE_CONFIG_INVALID",
      "Site config schemaVersion does not match the request",
    );
  }

  await db.transaction(async (tx) => {
    const [site] = await tx
      .select({ id: websiteSites.id, publishedRevisionId: websiteSites.publishedRevisionId })
      .from(websiteSites)
      .where(eq(websiteSites.id, siteId))
      .limit(1)
      .for("update");
    if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");

    const [draft] = await tx
      .select({
        version: websiteSiteDrafts.version,
        isDirty: websiteSiteDrafts.isDirty,
      })
      .from(websiteSiteDrafts)
      .where(eq(websiteSiteDrafts.siteId, siteId))
      .limit(1)
      .for("update");
    if (!draft) {
      throw new SiteEditorError(
        409,
        "SITE_HAS_NO_DRAFT_SOURCE",
        "Site has no editable relational draft",
      );
    }
    const currentRevisionId = draft.isDirty
      ? draftToken(siteId, draft.version)
      : site.publishedRevisionId ?? draftToken(siteId, draft.version);
    if (currentRevisionId !== body.expectedRevisionId) {
      throw new SiteEditorError(409, "STALE_REVISION", "The site changed since it was loaded");
    }

    const templateSources = await validatePageTemplateSources(
      tx,
      siteId,
      parsed,
      body.pageTemplateSources,
    );
    await persistSiteRows(tx, siteId, parsed, {
      pageTemplateVersionIds: templateSources,
    });
    await tx
      .update(websiteSiteDrafts)
      .set({
        schemaVersion: parsed.schemaVersion,
        settings: parsed.settings,
        version: draft.version + 1,
        isDirty: true,
        updatedBy: createdBy,
        updated: new Date(),
      })
      .where(eq(websiteSiteDrafts.siteId, siteId));
    await tx
      .update(websiteSites)
      .set({ ...(body.slug ? { slug: body.slug } : {}), updated: new Date() })
      .where(eq(websiteSites.id, siteId));
  });

  return editorState(siteId);
}

async function publishDraft(siteId: string, expectedRevisionId: string) {
  const result = await db.transaction(async (tx) => {
    const [site] = await tx
      .select({ id: websiteSites.id, publishedRevisionId: websiteSites.publishedRevisionId })
      .from(websiteSites)
      .where(eq(websiteSites.id, siteId))
      .limit(1)
      .for("update");
    if (!site) throw new SiteEditorError(404, "SITE_NOT_FOUND", "Site not found");

    const [draft] = await tx
      .select({
        schemaVersion: websiteSiteDrafts.schemaVersion,
        settings: websiteSiteDrafts.settings,
        version: websiteSiteDrafts.version,
        isDirty: websiteSiteDrafts.isDirty,
        updatedBy: websiteSiteDrafts.updatedBy,
      })
      .from(websiteSiteDrafts)
      .where(eq(websiteSiteDrafts.siteId, siteId))
      .limit(1)
      .for("update");
    if (!draft) {
      throw new SiteEditorError(
        409,
        "SITE_HAS_NO_DRAFT_SOURCE",
        "Site has no editable relational draft",
      );
    }

    if (!draft.isDirty) {
      if (site.publishedRevisionId !== expectedRevisionId) {
        throw new SiteEditorError(409, "NO_DRAFT", "There are no unpublished changes");
      }
      const domains = await tx
        .select({ hostname: websiteSiteDomains.hostname })
        .from(websiteSiteDomains)
        .where(and(
          eq(websiteSiteDomains.siteId, siteId),
          eq(websiteSiteDomains.status, "verified"),
        ));
      return {
        publishedRevisionId: site.publishedRevisionId,
        domains,
      };
    }

    if (draftToken(siteId, draft.version) !== expectedRevisionId) {
      throw new SiteEditorError(409, "STALE_REVISION", "The site changed since it was loaded");
    }
    const config = await readSiteConfig(tx, siteId, draft);
    try {
      splitSiteConfig(config);
    } catch (error) {
      throw new SiteEditorError(
        400,
        "SITE_CONFIG_INVALID",
        error instanceof Error ? error.message : "Site config is invalid",
      );
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
        schemaVersion: draft.schemaVersion,
        status: "published",
        config,
        baseRevisionId: site.publishedRevisionId,
        createdBy: draft.updatedBy,
        publishedAt: new Date(),
      })
      .returning({ id: websiteSiteRevisions.id });
    if (!revision) throw new Error("Failed to create published revision");

    await tx
      .update(websiteSites)
      .set({ status: "active", publishedRevisionId: revision.id, updated: new Date() })
      .where(eq(websiteSites.id, siteId));
    await tx
      .update(websiteSiteDrafts)
      .set({ isDirty: false, updated: new Date() })
      .where(eq(websiteSiteDrafts.siteId, siteId));
    const domains = await tx
      .select({ hostname: websiteSiteDomains.hostname })
      .from(websiteSiteDomains)
      .where(and(
        eq(websiteSiteDomains.siteId, siteId),
        eq(websiteSiteDomains.status, "verified"),
      ));
    return { publishedRevisionId: revision.id, domains };
  });

  return {
    siteId,
    publishedRevisionId: result.publishedRevisionId,
    domains: result.domains.map(({ hostname }) => hostname),
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
      isCanonical: websiteSiteDomains.isCanonical,
    })
    .from(websiteSiteDomains)
    .where(eq(websiteSiteDomains.siteId, siteId))
    .orderBy(asc(websiteSiteDomains.created));
  return { domains: domains.map(domainResponse) };
}

async function setCanonicalDomain(siteId: string, domainId: string) {
  const domain = await db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: websiteSiteDomains.id,
        hostname: websiteSiteDomains.hostname,
        status: websiteSiteDomains.status,
        verificationData: websiteSiteDomains.verificationData,
        verifiedAt: websiteSiteDomains.verifiedAt,
        isCanonical: websiteSiteDomains.isCanonical,
      })
      .from(websiteSiteDomains)
      .where(and(
        eq(websiteSiteDomains.siteId, siteId),
        eq(websiteSiteDomains.id, domainId),
      ))
      .limit(1);
    if (!target) {
      throw new SiteEditorError(404, "DOMAIN_NOT_FOUND", "Domain not found");
    }
    if (
      target.status !== "verified" ||
      !target.verifiedAt ||
      target.verificationData.source !== "custom"
    ) {
      throw new SiteEditorError(
        409,
        "DOMAIN_NOT_ELIGIBLE",
        "Only a verified custom domain can be canonical",
      );
    }
    if (!target.isCanonical) {
      await tx
        .update(websiteSiteDomains)
        .set({ isCanonical: false, updated: new Date() })
        .where(and(
          eq(websiteSiteDomains.siteId, siteId),
          eq(websiteSiteDomains.isCanonical, true),
        ));
      await tx
        .update(websiteSiteDomains)
        .set({ isCanonical: true, updated: new Date() })
        .where(eq(websiteSiteDomains.id, domainId));
    }
    return { ...target, isCanonical: true };
  });
  return domainResponse(domain);
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
      isCanonical: websiteSiteDomains.isCanonical,
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
    const isCanonical = state.status === "verified" && (existing?.isCanonical ?? false);
    await db
      .update(websiteSiteDomains)
      .set({ ...state, isCanonical, updated: new Date() })
      .where(eq(websiteSiteDomains.id, domainId));
    return domainResponse({
      id: domainId,
      hostname,
      ...state,
      isCanonical,
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
      isCanonical: websiteSiteDomains.isCanonical,
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
    const isCanonical = state.status === "verified" && existing.isCanonical;
    await db
      .update(websiteSiteDomains)
      .set({ ...state, isCanonical, updated: new Date() })
      .where(eq(websiteSiteDomains.id, existing.id));
    return domainResponse({ ...existing, ...state, isCanonical });
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
  .get("/", async ({ set }) => {
    try {
      return await listSites();
    } catch (error) {
      return handleError(error, set);
    }
  })
  .post("/", async ({ body, headers, set }) => {
    try {
      return await createSite(body, actorId(headers));
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: createBody })
  .post("/migrations", async ({ body, headers, set }) => {
    try {
      return await migrateSite(body, actorId(headers));
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: migrationBody })
  .get("/templates/pages", async ({ set }) => {
    try {
      return await listPageTemplates();
    } catch (error) {
      return handleError(error, set);
    }
  })
  .get("/templates/pages/:versionId", async ({ params, set }) => {
    try {
      return await resolvePageTemplate(params.versionId);
    } catch (error) {
      return handleError(error, set);
    }
  })
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
  .put("/:siteId/domains/:domainId/canonical", async ({ params, set }) => {
    try {
      return { domain: await setCanonicalDomain(params.siteId, params.domainId) };
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
