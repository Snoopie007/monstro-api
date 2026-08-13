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

export const websiteTemplates = pgTable(
  "website_templates",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('tpl_')`),
    vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    plan: text("plan"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull(),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_templates_platform_plan_uq")
      .on(table.plan)
      .where(sql`${table.vendorId} is null and ${table.kind} = 'site' and ${table.status} = 'active'`),
    index("website_templates_vendor_idx").on(table.vendorId),
    check(
      "website_templates_kind_check",
      sql`${table.kind} in ('site', 'page', 'block')`,
    ),
    check(
      "website_templates_plan_check",
      sql`(${table.kind} = 'site' and ${table.plan} in ('growth', 'scale')) or (${table.kind} <> 'site' and ${table.plan} is null)`,
    ),
    check(
      "website_templates_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
  ],
);

export const websiteTemplateVersions = pgTable(
  "website_template_versions",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('tplv_')`),
    templateId: text("template_id")
      .notNull()
      .references(() => websiteTemplates.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdBy: text("created_by").notNull(),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_template_versions_number_uq").on(
      table.templateId,
      table.versionNumber,
    ),
    index("website_template_versions_latest_idx").on(
      table.templateId,
      table.versionNumber,
    ),
    check(
      "website_template_versions_version_check",
      sql`${table.versionNumber} > 0 and ${table.schemaVersion} > 0`,
    ),
  ],
);

export const websiteSiteDrafts = pgTable(
  "website_site_drafts",
  {
    siteId: text("site_id")
      .primaryKey()
      .notNull()
      .references(() => websiteSites.id, { onDelete: "cascade" }),
    schemaVersion: integer("schema_version").notNull(),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .notNull(),
    version: integer("version").notNull().default(1),
    isDirty: boolean("is_dirty").notNull().default(true),
    updatedBy: text("updated_by").notNull(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "website_site_drafts_version_check",
      sql`${table.schemaVersion} > 0 and ${table.version} > 0`,
    ),
  ],
);

export const websitePages = pgTable(
  "website_pages",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('page_')`),
    siteId: text("site_id")
      .notNull()
      .references(() => websiteSites.id, { onDelete: "cascade" }),
    pageKey: text("page_key").notNull(),
    path: text("path").notNull(),
    kind: text("kind").notNull(),
    position: integer("position").notNull(),
    visible: boolean("visible").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull(),
    sourceTemplateVersionId: text("source_template_version_id").references(
      () => websiteTemplateVersions.id,
      { onDelete: "set null" },
    ),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_pages_key_uq").on(table.siteId, table.pageKey),
    uniqueIndex("website_pages_path_uq").on(table.siteId, table.path),
    uniqueIndex("website_pages_position_uq").on(table.siteId, table.position),
    index("website_pages_site_idx").on(table.siteId, table.position),
    index("website_pages_source_template_idx").on(table.sourceTemplateVersionId),
    check(
      "website_pages_kind_check",
      sql`${table.kind} in ('sections', 'builtin')`,
    ),
    check(
      "website_pages_position_check",
      sql`${table.position} >= 0`,
    ),
  ],
);

export const websiteBlocks = pgTable(
  "website_blocks",
  {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('block_')`),
    pageId: text("page_id")
      .notNull()
      .references(() => websitePages.id, { onDelete: "cascade" }),
    blockKey: text("block_key").notNull(),
    type: text("type").notNull(),
    position: integer("position").notNull(),
    visible: boolean("visible").notNull(),
    props: jsonb("props")
      .$type<Record<string, unknown>>()
      .notNull(),
    sourceTemplateVersionId: text("source_template_version_id").references(
      () => websiteTemplateVersions.id,
      { onDelete: "set null" },
    ),
    created: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_blocks_key_uq").on(table.pageId, table.blockKey),
    uniqueIndex("website_blocks_position_uq").on(table.pageId, table.position),
    index("website_blocks_page_idx").on(table.pageId, table.position),
    index("website_blocks_source_template_idx").on(table.sourceTemplateVersionId),
    check(
      "website_blocks_position_check",
      sql`${table.position} >= 0`,
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
