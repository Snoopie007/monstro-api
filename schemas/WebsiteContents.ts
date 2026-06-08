import { sql } from "drizzle-orm";
import {
    check,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    unique,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { users } from "./users";

export const ContentTypeEnum = pgEnum("ContentType", ["post", "page"]);
export const ContentStatusEnum = pgEnum("ContentStatus", ["draft", "published", "archived"]);

export const contentCategories = pgTable("content_categories", {
    id: serial("id").primaryKey(),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
},
    (t) => [unique("content_categories_location_slug_unique").on(t.locationId, t.slug)],
);

export const websiteContents = pgTable("website_contents", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    type: ContentTypeEnum("type").notNull(),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    mdx: text("mdx").notNull(),
    status: ContentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    parentId: text("parent_id").references((): AnyPgColumn => websiteContents.id, {
        onDelete: "set null",
    }),
    featuredImageUrl: text("featured_image_url"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
},
    (t) => [
        unique("content_slug_per_type_unique").on(t.locationId, t.type, t.slug),
        check("content_page_parent_check", sql`${t.parentId} IS NULL OR ${t.type} = 'page'`),
    ],
);

export const websiteContentCategories = pgTable("website_content_categories", {
    contentId: text("content_id").notNull().references(() => websiteContents.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").notNull().references(() => contentCategories.id, { onDelete: "cascade" }),
},
    (t) => [primaryKey({ columns: [t.contentId, t.categoryId] })],
);
