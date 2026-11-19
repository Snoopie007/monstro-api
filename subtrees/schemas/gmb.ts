import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	check,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
	GMBKeywordScanCompetitor,
	GMBKeywordScanData,
	GMBPostCallToAction,
	GMBPostPhotoSource,
	GMBPostStatus,
	GMBProfile,
	GMBScanDevice,
	GMBScanStatus,
} from "../types/gmb";
import { locationAddons } from "./addons";
import { locations } from "./locations";

/**
 * Managed Google Business Profile.
 * `addonId` null = free/standard (Google APIs only).
 * `addonId` set = Pro seat (DataForSEO insights + keyword scans).
 */
export const gmb = pgTable(
	"gmb",
	{
		id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
		locationId: text("location_id")
			.notNull()
			.references(() => locations.id, { onDelete: "cascade" }),
		addonId: text("addon_id")
			.unique()
			.references(() => locationAddons.id, { onDelete: "set null" }),
		googleLocationName: text("google_location_name").notNull(),
		cid: text("cid"),
		placeId: text("place_id"),
		profile: jsonb("profile").$type<GMBProfile>(),
		/** Last Google profile pull; refreshed at most every 30 days. */
		lastProfileCached: timestamp("last_profile_cached", { withTimezone: true }),
		/** Pro: workers write and publish one post a day (`gmb_posts`). */
		autoPost: boolean("auto_post").notNull().default(false),
		created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updated: timestamp("updated_at", { withTimezone: true }),
	},
	(t) => [uniqueIndex("gmb_location_google_uidx").on(t.locationId, t.googleLocationName)],
);

/** Tracked keywords for a managed GMB (Pro). */
export const gmbKeywords = pgTable("gmb_keywords", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
	gmbId: text("gmb_id").notNull().references(() => gmb.id, { onDelete: "cascade" }),
	keyword: text("keyword").notNull(),
	/** Last completed scan. Stays put while a new scan is running. */
	latestScanId: text("latest_scan_id").references((): AnyPgColumn => gmbKeywordScans.id, { onDelete: "set null" }),
	/** Scan in progress. Cleared when that scan completes or fails. */
	pendingScanId: text("pending_scan_id").references((): AnyPgColumn => gmbKeywordScans.id, { onDelete: "set null" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
},
	(t) => [
		uniqueIndex("gmb_keywords_gmb_keyword_uidx").on(t.gmbId, t.keyword),
		uniqueIndex("gmb_keywords_latest_scan_id_uidx").on(t.latestScanId),
		uniqueIndex("gmb_keywords_pending_scan_id_uidx").on(t.pendingScanId),
	],
);

/**
 * One geo-grid run for a keyword.
 * `data` = self grid pins; `competitors` = top rivals from the same Maps SERPs (frozen on scan).
 */
export const gmbKeywordScans = pgTable("gmb_keyword_scans", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
	keywordId: text("keyword_id")
		.notNull()
		.references(() => gmbKeywords.id, { onDelete: "cascade" }),
	centerLat: doublePrecision("center_lat"),
	centerLng: doublePrecision("center_lng"),
	gridSize: integer("grid_size").notNull().default(5),
	spacingKm: doublePrecision("spacing_km").notNull().default(2),
	/** Maps search device. Phone rankings differ from desktop. */
	device: text("device").$type<GMBScanDevice>().notNull().default("desktop"),
	/** Grid pin ranks for self. */
	data: jsonb("data").$type<GMBKeywordScanData>().notNull().default(sql`'{"points":[]}'::jsonb`),
	/** Top competitors from this scan's Maps results (slim snapshot). */
	competitors: jsonb("competitors")
		.$type<GMBKeywordScanCompetitor[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	/** Weighted grid performance 0–100 (100 = #1 at every point). */
	visScore: doublePrecision("vis_score"),
	/** Mean of ranked grid points. */
	avgRank: doublePrecision("avg_rank"),
	/** Relative review/rating score vs scan competitors 0–100. */
	reviewScore: doublePrecision("review_score"),
	/** `pending` until every grid pin's DataForSEO task has reported back. */
	status: text("status").$type<GMBScanStatus>().notNull().default("pending"),
	/** Grid pins reported back so far; done when it reaches `data.points.length`. */
	progress: integer("progress").notNull().default(0),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Photos the owner uploads for auto-posts. Review photos are read from Google when a post is drafted. */
export const gmbPostPhotos = pgTable(
	"gmb_post_photos",
	{
		id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
		gmbId: text("gmb_id").notNull().references(() => gmb.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("gmb_post_photos_gmb_id_idx").on(t.gmbId)],
);

/**
 * One auto-post. The row is the record; queue jobs carry only its id.
 * A profile has at most one scheduled post.
 */
export const gmbPosts = pgTable(
	"gmb_posts",
	{
		id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
		gmbId: text("gmb_id").notNull().references(() => gmb.id, { onDelete: "cascade" }),
		status: text("status").$type<GMBPostStatus>().notNull().default("scheduled"),
		summary: text("summary").notNull(),
		callToAction: jsonb("call_to_action").$type<GMBPostCallToAction>(),
		/** Every post has a photo. */
		photoUrl: text("photo_url").notNull(),
		photoSource: text("photo_source").$type<GMBPostPhotoSource>().notNull(),
		/** `gmb_post_photos.id` for uploads; the Google review name for review photos. */
		/** photo_ref: which photo. upload: gmb_post_photos.id; review: "<review name>#<media index>". Published posts are the record of used photos. */
		photoRef: text("photo_ref"),
		scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		/** Google's `accounts/../locations/../localPosts/..` name once published. */
		googlePostName: text("google_post_name"),
		searchUrl: text("search_url"),
		/** Why the post failed or was canceled. */
		error: text("error"),
		created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updated: timestamp("updated_at", { withTimezone: true }),
	},
	(t) => [
		index("gmb_posts_gmb_scheduled_idx").on(t.gmbId, t.scheduledFor),
		uniqueIndex("gmb_posts_one_open_uidx")
			.on(t.gmbId)
			.where(sql`status = 'scheduled'`),
		check(
			"gmb_posts_status",
			sql`${t.status} in ('scheduled', 'published', 'failed', 'canceled')`,
		),
		check("gmb_posts_photo_source", sql`${t.photoSource} in ('upload', 'review')`),
	],
);
