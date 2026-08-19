import { Elysia, t } from "elysia";
import { timingSafeEqual } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { publicSiteConfig } from "@/libs/siteDraftConfig";
import {
  integrations,
  locationState,
  locations,
  normalizeLocationSlug,
  websiteSiteDomains,
  websiteSiteLocations,
  websiteSiteRevisions,
  websiteSites,
} from "@subtrees/schemas";
import { getLocationPlans } from "./plans";
import { getLocationSchedules } from "./schedules";
import { getPublishedBlogPost, getPublishedBlogPosts } from "./content";
import { getActiveLocationProduct, getActiveLocationProducts } from "./merc";
import { submitGhlFormContact } from "@/handlers/formSubmissions";
import { siteLocationMapFacts } from "@/libs/siteLocationMapFacts";

async function findActiveSiteLocation(siteId: string, locationId: string) {
  const [siteLocation] = await db
    .select({
      siteId: websiteSites.id,
      publishedRevisionId: websiteSites.publishedRevisionId,
      locationId: locations.id,
      currency: locationState.currency,
    })
    .from(websiteSites)
    .innerJoin(
      websiteSiteLocations,
      eq(websiteSiteLocations.siteId, websiteSites.id),
    )
    .innerJoin(locations, eq(websiteSiteLocations.locationId, locations.id))
    .leftJoin(locationState, eq(locationState.locationId, locations.id))
    .where(
      and(
        eq(websiteSites.id, siteId),
        eq(websiteSites.status, "active"),
        eq(websiteSiteLocations.locationId, locationId),
        eq(locations.vendorId, websiteSites.vendorId),
      ),
    )
    .limit(1);

  return siteLocation ?? null;
}

function parseDateOnly(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function normalizeHostname(value: string): string | null {
  const candidate = value.trim().toLowerCase();
  if (!candidate || candidate.includes("://") || /[/@?#\s]/.test(candidate)) {
    return null;
  }

  try {
    const hostname = new URL(`http://${candidate}`).hostname
      .toLowerCase()
      .replace(/\.$/, "");
    return hostname.length <= 253 ? hostname || null : null;
  } catch {
    return null;
  }
}

function readCapabilities(config: unknown): unknown {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  return (config as Record<string, unknown>).capabilities ?? null;
}

function readGhlCredentials(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const integrations = (config as Record<string, unknown>).integrations;
  if (!integrations || typeof integrations !== "object" || Array.isArray(integrations)) return null;
  const ghl = (integrations as Record<string, unknown>).ghl;
  if (!ghl || typeof ghl !== "object" || Array.isArray(ghl)) return null;
  const privateIntegrationToken = (ghl as Record<string, unknown>).privateIntegrationToken;
  const locationId = (ghl as Record<string, unknown>).locationId;
  return typeof privateIntegrationToken === "string" && privateIntegrationToken.trim()
    && typeof locationId === "string" && locationId.trim()
    ? {
        privateIntegrationToken: privateIntegrationToken.trim(),
        locationId: locationId.trim(),
      }
    : null;
}


function readGatewayService(value: string | null): "stripe" | "square" | "authorize" | null {
  return value === "stripe" || value === "square" || value === "authorize" ? value : null;
}

const openingDays = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

function locationFacts(value: unknown, selectedGmb: unknown) {
  const metadata = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const openingHours = Array.isArray(metadata.openingHours)
    ? metadata.openingHours.flatMap((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const item = value as Record<string, unknown>;
        if (
          !Array.isArray(item.dayOfWeek) ||
          !item.dayOfWeek.every((day) => typeof day === "string" && openingDays.has(day)) ||
          typeof item.opens !== "string" ||
          typeof item.closes !== "string" ||
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.opens) ||
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.closes)
        ) return [];
        return [{
          dayOfWeek: item.dayOfWeek,
          opens: item.opens,
          closes: item.closes,
        }];
      })
    : undefined;
  const rating =
    typeof metadata.rating === "number" && metadata.rating >= 0 && metadata.rating <= 5
      ? metadata.rating
      : undefined;
  const reviewCount =
    typeof metadata.userRatingCount === "number" &&
    Number.isInteger(metadata.userRatingCount) &&
    metadata.userRatingCount >= 0
      ? metadata.userRatingCount
      : undefined;
  return {
    ...siteLocationMapFacts({
      locationMetadata: value,
      selectedGmb,
    }).location,
    openingHours,
    rating,
    reviewCount,
  };
}

function hasSitesServiceToken(request: Request): boolean {
  const expected = Bun.env.MONSTRO_SITES_SERVICE_TOKEN;
  const supplied = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length
    && timingSafeEqual(expectedBytes, suppliedBytes);
}

export const webSiteRoutes = new Elysia({ prefix: "/sites" }).get(
  "/resolve",
  async ({ query, status }) => {
    const hostname = normalizeHostname(query.hostname);
    if (!hostname) {
      return status(400, {
        code: "INVALID_HOSTNAME",
        message: "A valid hostname is required",
      });
    }

    const [resolved] = await db
      .select({
        siteId: websiteSites.id,
        vendorId: websiteSites.vendorId,
        publishedRevisionId: websiteSites.publishedRevisionId,
        domain: websiteSiteDomains.hostname,
        verificationData: websiteSiteDomains.verificationData,
        isCanonical: websiteSiteDomains.isCanonical,
      })
      .from(websiteSiteDomains)
      .innerJoin(websiteSites, eq(websiteSiteDomains.siteId, websiteSites.id))
      .where(
        and(
          eq(websiteSiteDomains.hostname, hostname),
          eq(websiteSiteDomains.status, "verified"),
          eq(websiteSites.status, "active"),
        ),
      )
      .limit(1);

    if (!resolved?.publishedRevisionId) {
      return status(404, {
        code: "SITE_NOT_FOUND",
        message: "No published site is connected to this domain",
      });
    }

    const [revisionRows, locationRows, canonicalRows] = await Promise.all([
      db
        .select({
          id: websiteSiteRevisions.id,
          schemaVersion: websiteSiteRevisions.schemaVersion,
          config: websiteSiteRevisions.config,
          publishedAt: websiteSiteRevisions.publishedAt,
        })
        .from(websiteSiteRevisions)
        .where(
          and(
            eq(websiteSiteRevisions.id, resolved.publishedRevisionId),
            eq(websiteSiteRevisions.siteId, resolved.siteId),
            eq(websiteSiteRevisions.status, "published"),
          ),
        )
        .limit(1),
      db
        .select({
          id: locations.id,
          slug: locations.slug,
          name: locations.name,
          address: locations.address,
          timezone: locations.timezone,
          phone: locations.phone,
          email: locations.email,
          city: locations.city,
          state: locations.state,
          postalCode: locations.postalCode,
          country: locations.country,
          metadata: locations.metadata,
          selectedGmb: locationState.gmb,
          currency: locationState.currency,
          gatewayService: integrations.service,
          vendorId: locations.vendorId,
          isPrimary: websiteSiteLocations.isPrimary,
        })
        .from(websiteSiteLocations)
        .innerJoin(locations, eq(websiteSiteLocations.locationId, locations.id))
        .leftJoin(locationState, eq(locationState.locationId, locations.id))
        .leftJoin(
          integrations,
          and(
            eq(integrations.id, locationState.paymentGatewayId),
            eq(integrations.locationId, locations.id),
          ),
        )
        .where(eq(websiteSiteLocations.siteId, resolved.siteId))
        .orderBy(
          asc(websiteSiteLocations.displayOrder),
          asc(websiteSiteLocations.locationId),
        ),
      db
        .select({ hostname: websiteSiteDomains.hostname })
        .from(websiteSiteDomains)
        .where(and(
          eq(websiteSiteDomains.siteId, resolved.siteId),
          eq(websiteSiteDomains.isCanonical, true),
        ))
        .limit(1),
    ]);

    const revision = revisionRows[0];
    const primaryLocations = locationRows.filter((location) => location.isPrimary);
    if (
      !revision ||
      locationRows.length === 0 ||
      primaryLocations.length !== 1 ||
      locationRows.some((location) => location.vendorId !== resolved.vendorId)
    ) {
      return status(500, {
        code: "SITE_CONFIG_INVALID",
        message: "The published site configuration is invalid",
      });
    }

    return status(200, {
      context: {
        siteId: resolved.siteId,
        vendorId: resolved.vendorId,
        primaryLocationId: primaryLocations[0]!.id,
        allowedLocationIds: locationRows.map((location) => location.id),
        locations: locationRows.map((location) => ({
          id: location.id,
          slug: normalizeLocationSlug(location.slug)
            || normalizeLocationSlug(location.name)
            || normalizeLocationSlug(location.id),
          name: location.name,
          ...(location.address ? { address: location.address } : {}),
          ...(location.phone ? { phone: location.phone } : {}),
          ...(location.email ? { email: location.email } : {}),
          ...(location.country ? {
            postalAddress: {
              ...(location.address ? { streetAddress: location.address } : {}),
              ...(location.city ? { addressLocality: location.city } : {}),
              ...(location.state ? { addressRegion: location.state } : {}),
              ...(location.postalCode ? { postalCode: location.postalCode } : {}),
              addressCountry: location.country,
            },
          } : {}),
          ...locationFacts(location.metadata, location.selectedGmb),
          timezone: location.timezone,
          paymentGateway: readGatewayService(location.gatewayService),
          ...(location.currency ? { currency: location.currency } : {}),
        })),
        domain: resolved.domain,
        domainSource: resolved.verificationData.source === "wildcard" ? "wildcard" : "custom",
        canonicalDomain: canonicalRows[0]?.hostname ?? null,
        isCanonicalDomain: resolved.isCanonical,
        publishedRevisionId: revision.id,
        capabilities: readCapabilities(revision.config),
      },
      revision: {
        id: revision.id,
        schemaVersion: revision.schemaVersion,
        config: publicSiteConfig(revision.config),
        publishedAt: revision.publishedAt?.toISOString() ?? null,
      },
    });
  },
  {
    query: t.Object({
      hostname: t.String({ minLength: 1 }),
    }),
  },
)
  .get(
    "/:siteId/locations/:locationId/schedules",
    async ({ params, query, status }) => {
      const siteLocation = await findActiveSiteLocation(
        params.siteId,
        params.locationId,
      );
      if (!siteLocation) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }

      if (!parseDateOnly(query.date)) {
        return status(400, {
          code: "INVALID_DATE",
          message: "A valid date in YYYY-MM-DD format is required",
        });
      }

      try {
        const result = await getLocationSchedules(params.locationId, query.date);
        if (result.kind === "not_found") {
          return status(404, { error: "Location not found" });
        }
        if (result.kind === "inactive") {
          return status(400, { error: "Location is not active" });
        }
        return status(200, { sessions: result.sessions });
      } catch (error) {
        console.error(error);
        return status(500, { error: "Internal server error" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        date: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    "/:siteId/locations/:locationId/plans",
    async ({ params, status }) => {
      const siteLocation = await findActiveSiteLocation(
        params.siteId,
        params.locationId,
      );
      if (!siteLocation) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }

      try {
        return status(200, await getLocationPlans(params.locationId));
      } catch (error) {
        console.error(error);
        return status(500, { error: "Failed to fetch products" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    "/:siteId/locations/:locationId/posts",
    async ({ params, query, status }) => {
      if (!await findActiveSiteLocation(params.siteId, params.locationId)) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }
      try {
        const { posts, total } = await getPublishedBlogPosts(
          params.locationId,
          query.page,
          query.limit,
        );
        return status(200, {
          total,
          posts: posts.map((post) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            featuredImageUrl: post.featuredImageUrl,
            publishedAt: post.publishedAt?.toISOString() ?? null,
            updatedAt: post.updated?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        console.error(error);
        return status(500, { error: "Failed to fetch posts" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    },
  )
  .get(
    "/:siteId/locations/:locationId/posts/:slug",
    async ({ params, status }) => {
      if (!await findActiveSiteLocation(params.siteId, params.locationId)) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }
      try {
        const post = await getPublishedBlogPost(params.locationId, params.slug);
        if (!post) {
          return status(404, {
            code: "POST_NOT_FOUND",
            message: "Post not found",
          });
        }
        return status(200, {
          id: post.id,
          title: post.title,
          slug: post.slug,
          mdx: post.mdx,
          featuredImageUrl: post.featuredImageUrl,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          updatedAt: post.updated?.toISOString() ?? null,
          authorName: post.authorName,
        });
      } catch (error) {
        console.error(error);
        return status(500, { error: "Failed to fetch post" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
        slug: t.String({
          minLength: 1,
          maxLength: 160,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        }),
      }),
    },
  )
  .get(
    "/:siteId/locations/:locationId/products",
    async ({ params, status }) => {
      const siteLocation = await findActiveSiteLocation(params.siteId, params.locationId);
      if (!siteLocation) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }
      try {
        const products = await getActiveLocationProducts(params.locationId);
        return status(200, products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          subCategory: product.subCategory,
          description: product.description,
          brand: product.brand,
          active: product.active,
          currency: siteLocation.currency,
          createdAt: product.created.toISOString(),
          updatedAt: product.updated?.toISOString() ?? null,
          variants: product.variants
            .filter((variant) => variant.active)
            .map((variant) => ({
              id: variant.id,
              productId: variant.productId,
              name: variant.name,
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              price: variant.price,
              salePrice: variant.salePrice,
              stock: variant.stock,
              active: variant.active,
            })),
          images: product.images.map((image) => ({
            id: image.id,
            productId: image.productId,
            imageUrl: image.imageUrl,
            sortOrder: image.sortOrder,
          })),
        })));
      } catch (error) {
        console.error(error);
        return status(500, { error: "Failed to fetch products" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    "/:siteId/locations/:locationId/products/:productId",
    async ({ params, status }) => {
      const siteLocation = await findActiveSiteLocation(params.siteId, params.locationId);
      if (!siteLocation) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }
      try {
        const product = await getActiveLocationProduct(params.locationId, params.productId);
        if (!product) {
          return status(404, {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          });
        }
        return status(200, {
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          subCategory: product.subCategory,
          description: product.description,
          brand: product.brand,
          active: product.active,
          currency: siteLocation.currency,
          createdAt: product.created.toISOString(),
          updatedAt: product.updated?.toISOString() ?? null,
          variants: product.variants
            .filter((variant) => variant.active)
            .map((variant) => ({
              id: variant.id,
              productId: variant.productId,
              name: variant.name,
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              price: variant.price,
              salePrice: variant.salePrice,
              stock: variant.stock,
              active: variant.active,
            })),
          images: product.images.map((image) => ({
            id: image.id,
            productId: image.productId,
            imageUrl: image.imageUrl,
            sortOrder: image.sortOrder,
          })),
        });
      } catch (error) {
        console.error(error);
        return status(500, { error: "Failed to fetch product" });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1 }),
        locationId: t.String({ minLength: 1 }),
        productId: t.String({ minLength: 1 }),
      }),
    },
  )
  .post(
    "/:siteId/locations/:locationId/forms/:formId/submissions",
    async ({ params, body, request, status }) => {
      if (!hasSitesServiceToken(request)) {
        return status(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      const siteLocation = await findActiveSiteLocation(params.siteId, params.locationId);
      if (!siteLocation?.publishedRevisionId) {
        return status(404, {
          code: "SITE_LOCATION_NOT_FOUND",
          message: "Site location not found",
        });
      }
      try {
        const [revision] = await db
          .select({ config: websiteSiteRevisions.config })
          .from(websiteSiteRevisions)
          .where(and(
            eq(websiteSiteRevisions.id, siteLocation.publishedRevisionId),
            eq(websiteSiteRevisions.siteId, params.siteId),
            eq(websiteSiteRevisions.status, "published"),
          ))
          .limit(1);
        const credentials = readGhlCredentials(revision?.config);
        if (!credentials) throw new Error("GHL credentials are not configured");
        await submitGhlFormContact(credentials, body.contact);
        return status(200, { ok: true });
      } catch {
        return status(503, {
          code: "FORM_PROVIDER_UNAVAILABLE",
          message: "Form provider unavailable",
        });
      }
    },
    {
      params: t.Object({
        siteId: t.String({ minLength: 1, maxLength: 128 }),
        locationId: t.String({ minLength: 1, maxLength: 128 }),
        formId: t.String({ minLength: 1, maxLength: 128 }),
      }),
      body: t.Object({
        contact: t.Object({
          firstName: t.Optional(t.String({ maxLength: 500 })),
          lastName: t.Optional(t.String({ maxLength: 500 })),
          name: t.Optional(t.String({ maxLength: 1_000 })),
          email: t.Optional(t.String({ maxLength: 500 })),
          phone: t.Optional(t.String({ maxLength: 100 })),
          source: t.Literal("Generated website form"),
          tags: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 100 }),
          customFields: t.Array(t.Object({
            key: t.String({ minLength: 1, maxLength: 128 }),
            field_value: t.String({ maxLength: 10_000 }),
          }), { maxItems: 100 }),
        }),
      }),
    },
  );
