import type { locationAddons } from "../schemas/addons";
import type { gmb, gmbKeywordScans, gmbKeywords, gmbPostPhotos, gmbPosts } from "../schemas/gmb";
import type { GMBLocation } from "./other";

/** Google `Money`: `units` is whole currency units, `nanos` is billionths. */
export type GoogleMoney = {
	currencyCode: string;
	units?: string;
	nanos?: number;
};

export type GoogleCategory = {
	name?: string;
	displayName?: string;
	serviceTypes?: Array<{ serviceTypeId?: string; displayName?: string }>;
};

export type GoogleTimeOfDay = { hours?: number; minutes?: number };

export type GoogleDayOfWeek =
	| "MONDAY"
	| "TUESDAY"
	| "WEDNESDAY"
	| "THURSDAY"
	| "FRIDAY"
	| "SATURDAY"
	| "SUNDAY";

export type GoogleTimePeriod = {
	openDay?: GoogleDayOfWeek;
	openTime?: GoogleTimeOfDay;
	closeDay?: GoogleDayOfWeek;
	closeTime?: GoogleTimeOfDay;
};

/** Google Business Information API location (live merchant view). */
export type GoogleBusinessLocation = Omit<GMBLocation, "metadata"> & {
	metadata?: GMBLocation["metadata"] & { hasVoiceOfMerchant?: boolean };
	phoneNumbers?: {
		primaryPhone?: string;
		additionalPhones?: string[];
	};
	categories?: {
		primaryCategory?: GoogleCategory;
		additionalCategories?: GoogleCategory[];
	};
	profile?: { description?: string };
	openInfo?: { status?: string; canReopen?: boolean };
	regularHours?: { periods?: GoogleTimePeriod[] };
	serviceItems?: Array<{
		structuredServiceItem?: { serviceTypeId?: string; description?: string };
		freeFormServiceItem?: {
			category?: string;
			label?: { displayName?: string; description?: string; languageCode?: string };
		};
		price?: GoogleMoney;
	}>;
};

export type GoogleReview = {
	name?: string;
	reviewId?: string;
	reviewer?: {
		displayName?: string;
		profilePhotoUrl?: string;
		isAnonymous?: boolean;
	};
	starRating?: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
	comment?: string;
	createTime?: string;
	updateTime?: string;
	reviewReply?: { comment?: string; updateTime?: string };
	/** Photos or videos the reviewer attached. `thumbnailUrl` is a resizable Google (FIFE) URL. */
	reviewMediaItems?: Array<{ thumbnailUrl?: string; thumbnailLabel?: string; videoUrl?: string }>;
};

/** `scheduled` → `published` | `failed`; `canceled` when auto-post is turned off or the post is replaced. */
export type GMBPostStatus = "scheduled" | "published" | "failed" | "canceled";
/** `upload` = owner's photo library (`gmb_post_photos`); `review` = a photo from a Google review. */
export type GMBPostPhotoSource = "upload" | "review";
export type GMBPostCallToAction = {
	actionType: "LEARN_MORE" | "BOOK" | "SIGN_UP" | "CALL";
	/** Unset for `CALL`. */
	url?: string;
};
export type GMBPost = typeof gmbPosts.$inferSelect;
export type GMBPostPhoto = typeof gmbPostPhotos.$inferSelect;

export type GoogleLocalPost = {
	name?: string;
	summary?: string;
	searchUrl?: string;
	createTime?: string;
	callToAction?: { url?: string };
	event?: { title?: string };
	media?: Array<{ googleUrl?: string; mediaFormat?: "PHOTO" | "VIDEO" }>;
};

export type GoogleMediaItem = {
	name?: string;
	mediaFormat?: "PHOTO" | "VIDEO";
	googleUrl?: string;
	thumbnailUrl?: string;
	createTime?: string;
	description?: string;
	locationAssociation?: { category?: string };
};

export const GMB_AUDIT_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type GMBAuditStatus = (typeof GMB_AUDIT_STATUSES)[number];

/** Input / display shape for a tracked keyword (row lives on `gmb_keywords`). */
export type GMBKeyword = {
	keyword: string;
};

/** DB row for `gmb_keywords`. */
export type GMBKeywordRecord = typeof gmbKeywords.$inferSelect;

/** DB row for `gmb_keyword_scans`. */
export type GMBKeywordScan = typeof gmbKeywordScans.$inferSelect;

/** Slim score row for sparkline / delta (no grid `data`). */
export type GMBKeywordScanScore = Pick<
	GMBKeywordScan,
	"id" | "created" | "visScore" | "avgRank" | "reviewScore"
>;

/** Thin scan row for history lists (no grid `data`). */
export type GMBKeywordScanSummary = Pick<
	GMBKeywordScan,
	| "id"
	| "created"
	| "gridSize"
	| "visScore"
	| "avgRank"
	| "reviewScore"
	| "competitors"
	| "centerLat"
	| "centerLng"
>;

/** Keyword list item: last completed scan, the scan still running, and thin older scores. */
export type GMBKeywordWithLatestScan = GMBKeywordRecord & {
	latestScan: Pick<
		GMBKeywordScan,
		| "id"
		| "created"
		| "gridSize"
		| "visScore"
		| "avgRank"
		| "reviewScore"
		| "data"
		| "status"
	> | null;
	/** In-progress scan. Null when nothing is running. */
	pendingScan: Pick<
		GMBKeywordScan,
		"id" | "created" | "gridSize" | "status" | "progress"
	> | null;
	/** Older completed scans only (latest excluded), newest first. */
	scans: GMBKeywordScanScore[];
};

export type GMBScanStatus = "pending" | "completed" | "failed";

export type GMBScanDevice = "mobile" | "desktop";

/** Maps SERP item fields read from a DataForSEO `maps_search` result. */
export type GMBMapsItem = {
	rank_absolute?: number;
	rank_group?: number | null;
	title?: string | null;
	cid?: string | number | null;
	place_id?: string | null;
	rating?: { value?: number | null; votes_count?: number | null } | null;
	address?: string | null;
	phone?: string | null;
	/** Business website. */
	url?: string | null;
	main_image?: string | null;
	total_photos?: number | null;
};

/** Keyword detail page: full latest scan + thin older history. */
export type GMBKeywordDetail = {
	keyword: GMBKeywordRecord;
	latestScan: GMBKeywordScan | null;
	/** Older completed scans only (latest excluded), newest first — no `data`. */
	scans: GMBKeywordScanSummary[];
};

export type GMBAuditKeyword = GMBKeyword & {
	centerRank?: number | null;
	selectedForGrid?: boolean;
};

export type GMBAuditCountPct = {
	count: number;
	pct: number;
};

export type GMBAuditReview = {
	reviewId?: string | null;
	authorName?: string | null;
	authorImage?: string | null;
	rating?: number | null;
	text?: string | null;
	timestamp?: string | null;
	hasOwnerReply: boolean;
	ownerReplyAt?: string | null;
	photoCount: number;
	hasVideo: boolean;
};

export type GMBAuditReviewStats = {
	total: number;
	analyzed: number;
	analyzedPct: number;
	rating: number | null;
	firstDate: string | null;
	lastDate: string | null;
	withContent: GMBAuditCountPct;
	withPhotos: GMBAuditCountPct;
	withVideos: GMBAuditCountPct;
	withOwnerReply: GMBAuditCountPct;
	topKeywords: Array<{ keyword: string; count: number }>;
};

export type GMBAuditPost = {
	author?: string | null;
	title?: string | null;
	content?: string | null;
	timestamp?: string | null;
	url?: string | null;
	imageUrl?: string | null;
	hasGallery: boolean;
	hasVideo: boolean;
};

export type GMBAuditPostStats = {
	total: number;
	firstDate: string | null;
	lastDate: string | null;
	withTitle: GMBAuditCountPct;
	withContent: GMBAuditCountPct;
	withImage: GMBAuditCountPct;
	withGallery: GMBAuditCountPct;
	withVideo: GMBAuditCountPct;
	avgContentWords: number | null;
};

export type GMBAuditPhoto = {
	url?: string | null;
	description?: string | null;
	timestamp?: string | null;
	source: "profile" | "review" | "post" | "video";
	isVideo: boolean;
};

export type GMBAuditPhotoStats = {
	total: number;
	analyzed: number;
	analyzedPct: number;
	firstDate: string | null;
	lastDate: string | null;
	withDescription: number;
	videos: number;
	uploadFrequencyDays: number | null;
};

/** @deprecated Audit-only shape. Scan rivals live on `gmb_keyword_scans.competitors`. */
export type GMBAuditCompetitor = {
	cid: string;
	placeId?: string | null;
	title?: string;
	category?: string | null;
	additionalCategories: string[];
	missingCategories: string[];
	services: string[];
	rating?: number | null;
	website?: string | null;
	reviews: GMBAuditReview[];
	reviewStats: GMBAuditReviewStats;
	posts: GMBAuditPost[];
	postStats: GMBAuditPostStats;
	photos: GMBAuditPhoto[];
	photoStats: GMBAuditPhotoStats;
};

/** One maps SERP row stored on a grid pin (depth ≤ 20). */
export type GMBAuditGridResult = {
	cid: string | null;
	placeId?: string | null;
	title?: string | null;
	rank: number | null;
	rating?: number | null;
	reviewCount?: number | null;
	address?: string | null;
	phone?: string | null;
	website?: string | null;
	image?: string | null;
	photoCount?: number | null;
};

export type GMBAuditGridPoint = {
	row: number;
	col: number;
	lat: number;
	lng: number;
	rank: number | null;
	topCid?: string | null;
	topTitle?: string | null;
	resultsCount?: number | null;
	/** Full depth list for this pin (cid + rank). Unset while the pin's task is still queued. */
	results?: GMBAuditGridResult[];
	/** DataForSEO task id for this pin; pingbacks must match it. */
	taskId?: string;
};

/** Grid pin payload stored on `gmb_keyword_scans.data`. */
export type GMBKeywordScanData = {
	points: GMBAuditGridPoint[];
};

/** @deprecated Use `GMBKeywordScanData`. */
export type GMBRankingData = GMBKeywordScanData;

/** @deprecated Use `GMBKeywordScanData`. */
export type GMBGridReportData = GMBKeywordScanData & {
	keyword?: string;
};

/**
 * Slim competitor snapshot frozen on `gmb_keyword_scans.competitors`
 * (from Maps SERP items on this grid run).
 */
export type GMBKeywordScanCompetitor = {
	cid: string | null;
	placeId?: string | null;
	name?: string | null;
	image?: string | null;
	phone?: string | null;
	website?: string | null;
	address?: string | null;
	category?: string | null;
	additionalCategories?: string[];
	photoCount?: number | null;
	rating?: number | null;
	reviewCount?: number | null;
	/** How many grid pins this rival appeared in. */
	hits?: number | null;
	/** Average grid rank on pins where this competitor appeared. */
	avgRank?: number | null;
	/** Visibility 0–100 across every grid pin. Missing pins count as 0. */
	visScore?: number | null;
};

export type GMBProfileAttribute = {
	group: string;
	label: string;
	available: boolean;
};

export type GMBPlaceTopic = {
	topic: string;
	count: number;
};

export type GMBRatingDistribution = {
	1: number;
	2: number;
	3: number;
	4: number;
	5: number;
};

export type GMBPopularTimeSlot = {
	hour: number;
	minute: number;
	popularIndex: number;
};

/** Slim competitor listing snapshot (Pro / DataForSEO). */
export type GMBCompetitorProfile = {
	name: string | null;
	phone?: string | null;
	image?: string | null;
	address?: string | null;
	postalCode?: string | null;
	city?: string | null;
	region?: string | null;
	website?: string | null;
	categories?: Array<{ name: string; gcid?: string | null }>;
	attributes?: GMBProfileAttribute[];
	description?: string | null;
	rating?: number | null;
	reviewCount?: number | null;
	latitude?: number | null;
	longitude?: number | null;
	cid?: string | null;
	placeId?: string | null;
	priceLevel?: string | null;
	claimed?: boolean | null;
	placeTopics?: GMBPlaceTopic[];
	ratingDistribution?: GMBRatingDistribution | null;
	peopleAlsoSearch?: Array<{ title: string; cid?: string | null; rating?: number | null }>;
};

export type GMBDay =
	| "sunday"
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday";

export type GMBTime = { hour: number; minute: number };

/** One open period. Closed days have no entry; `close <= open` means it runs past midnight. */
export type GMBWorkPeriod = {
	day: GMBDay;
	open: GMBTime;
	close: GMBTime;
};

/** Google PostalAddress (`storefrontAddress`), stored as returned. */
export type GMBAddressInfo = {
	addressLines?: string[];
	locality?: string;
	administrativeArea?: string;
	postalCode?: string;
	regionCode?: string;
};

export type GMBService = {
	title: string;
	description: string | null;
	price: GoogleMoney | null;
};

/** Google Business Profile details stored on `gmb.profile` (Google APIs only). */
export type GMBProfile = {
	/** Not exposed by Google APIs; reserved for the upgrade pull. */
	featureId: string | null;
	title: string | null;
	description: string | null;
	category: string | null;
	additionalCategories: string[];
	services: GMBService[];
	phone: string | null;
	url: string | null;
	/** Not exposed by the Business Information API; reserved for the upgrade pull. */
	bookOnlineUrl: string | null;
	address: string | null;
	addressInfo: GMBAddressInfo | null;
	/** Google returns `latlng` only when the owner set the pin manually; usually null. */
	latitude: number | null;
	longitude: number | null;
	isClaimed: boolean;
	workTime: GMBWorkPeriod[];
	rating: number | null;
	ratingCount: number | null;
	ratingDistribution: GMBRatingDistribution | null;
	totalPhotos: number | null;
};

export type GMBPerformanceMetric =
	| "BUSINESS_IMPRESSIONS_DESKTOP_MAPS"
	| "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"
	| "BUSINESS_IMPRESSIONS_MOBILE_MAPS"
	| "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"
	| "BUSINESS_DIRECTION_REQUESTS"
	| "CALL_CLICKS"
	| "WEBSITE_CLICKS";

export type GMBPerformanceTotals = Partial<Record<GMBPerformanceMetric, number>>;

/** Business Profile Performance metrics for the last 2 months, bucketed by YYYY-MM. */
export type GMBPerformance = {
	rangeStart: string;
	rangeEnd: string;
	fetchedAt: string;
	/** Sum across the full requested window. */
	totals: GMBPerformanceTotals;
	/** Calendar-month buckets (`YYYY-MM`) for month-over-month comparison. */
	byMonth: Record<string, GMBPerformanceTotals>;
};

/** DB row for `gmb`. */
export type GMBRecord = typeof gmb.$inferSelect;

/** GET /gmb/profile — saved row plus live Google activity (never stored). */
export type GMBProfileResponse = {
	/** `locationAddon` is the Pro seat linked via `addonId`; null on the free tier. */
	gmb: GMBRecord & { locationAddon: typeof locationAddons.$inferSelect | null };
	reviews: GoogleReview[];
	posts: GoogleLocalPost[];
	photos: GoogleMediaItem[];
	performance: GMBPerformance | null;
};

/** GET /gmb/posts — the Pro automations' switches, the auto-post pipeline and the photo library. */
export type GMBPostsResponse = {
	autoPost: boolean;
	/** The daily review auto-reply (its switch is on the Reviews card). */
	autoReply: boolean;
	/** The post waiting to go out. A profile has at most one. */
	scheduled: GMBPost | null;
	/** Posts that didn't publish, newest first. */
	failed: GMBPost[];
	/** Owner's photo library, newest first. */
	photos: GMBPostPhoto[];
};

/** Managed Google Business Profile. `profile` comes from the row select. */
export type GMB = typeof gmb.$inferSelect & {
	title: string | null;
	address: string | null;
};
