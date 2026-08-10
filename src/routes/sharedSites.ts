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
    readonly status: 404 | 409 | 503,
    readonly code: string,
    message: string,
  ) {
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
