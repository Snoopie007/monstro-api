import { Elysia, t } from "elysia";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
  integrations,
  locationState,
  locations,
  websiteSiteDomains,
  websiteSiteLocations,
  websiteSiteRevisions,
  websiteSites,
} from "@subtrees/schemas";
import { getLocationPlans } from "./plans";
import { getLocationSchedules } from "./schedules";
import { getPublishedBlogPost, getPublishedBlogPosts } from "./content";
import { getActiveLocationProduct, getActiveLocationProducts } from "./merc";

async function findActiveSiteLocation(siteId: string, locationId: string) {
  const [siteLocation] = await db
    .select({
      siteId: websiteSites.id,
      locationId: locations.id,
    })
    .from(websiteSites)
    .innerJoin(
      websiteSiteLocations,
      eq(websiteSiteLocations.siteId, websiteSites.id),
    )
    .innerJoin(locations, eq(websiteSiteLocations.locationId, locations.id))
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

function readGatewayService(value: string | null): "stripe" | "square" | "authorize" | null {
  return value === "stripe" || value === "square" || value === "authorize" ? value : null;
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

    const [revisionRows, locationRows] = await Promise.all([
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
          slug: location.slug,
          name: location.name,
          ...(location.address ? { address: location.address } : {}),
          timezone: location.timezone,
          paymentGateway: readGatewayService(location.gatewayService),
        })),
        domain: resolved.domain,
        publishedRevisionId: revision.id,
        capabilities: readCapabilities(revision.config),
      },
      revision: {
        id: revision.id,
        schemaVersion: revision.schemaVersion,
        config: revision.config,
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
      if (!await findActiveSiteLocation(params.siteId, params.locationId)) {
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
      if (!await findActiveSiteLocation(params.siteId, params.locationId)) {
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
  );
