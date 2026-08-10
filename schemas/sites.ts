import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { vendors } from "./vendors";

export const websiteSites = pgTable(
  "website_sites",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('site_')`),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    plan: text("plan").notNull(),
    status: text("status").notNull().default("draft"),
    publishedRevisionId: text("published_revision_id"),
    createdBy: text("created_by").notNull(),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_sites_vendor_slug_uq").on(table.vendorId, table.slug),
    check(
      "website_sites_plan_check",
      sql`${table.plan} in ('growth', 'scale')`,
    ),
    check(
      "website_sites_status_check",
      sql`${table.status} in ('draft', 'active', 'archived')`,
    ),
    check(
      "website_sites_active_revision_check",
      sql`${table.status} <> 'active' or ${table.publishedRevisionId} is not null`,
    ),
  ],
);

export const websiteSiteDomains = pgTable(
  "website_site_domains",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('dom_')`),
    siteId: text("site_id")
      .notNull()
      .references(() => websiteSites.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    status: text("status").notNull().default("pending"),
    verificationData: jsonb("verification_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_site_domains_hostname_uq").on(table.hostname),
    index("website_site_domains_site_idx").on(table.siteId),
    check(
      "website_site_domains_status_check",
      sql`${table.status} in ('pending', 'verified', 'disabled')`,
    ),
    check(
      "website_site_domains_verified_at_check",
      sql`${table.status} <> 'verified' or ${table.verifiedAt} is not null`,
    ),
  ],
);

export const websiteSiteLocations = pgTable(
  "website_site_locations",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => websiteSites.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.locationId] }),
    uniqueIndex("website_site_locations_primary_uq")
      .on(table.siteId)
      .where(sql`${table.isPrimary}`),
    index("website_site_locations_location_idx").on(table.locationId),
  ],
);

export const websiteSiteRevisions = pgTable(
  "website_site_revisions",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('rev_')`),
    siteId: text("site_id")
      .notNull()
      .references(() => websiteSites.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    status: text("status").notNull().default("draft"),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull(),
    baseRevisionId: text("base_revision_id").references(
      (): AnyPgColumn => websiteSiteRevisions.id,
      { onDelete: "set null" },
    ),
    createdBy: text("created_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_site_revisions_number_uq").on(
      table.siteId,
      table.revisionNumber,
    ),
    uniqueIndex("website_site_revisions_one_draft_idx")
      .on(table.siteId)
      .where(sql`${table.status} = 'draft'`),
    index("website_site_revisions_status_idx").on(table.siteId, table.status),
    check(
      "website_site_revisions_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "website_site_revisions_schema_version_check",
      sql`${table.schemaVersion} > 0`,
    ),
  ],
);
