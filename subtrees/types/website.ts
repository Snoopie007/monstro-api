import {
	websiteSiteDomains,
	websiteSiteDrafts,
	websiteSiteLocations,
	websiteSiteRevisions,
	websiteSites,
} from "../schemas/sites";
import type { Location } from "./location";
import type { Vendor } from "./vendor";

export type WebsiteConfigPage = {
	id: string;
	kind: "sections" | "builtin";
	path: string;
	visible: boolean;
	header?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	sections?: Record<string, unknown>[];
	displayLocationId?: string;
};

export type WebsiteConfigProgram = {
	id?: string;
	name: string;
	slug: string;
	visible?: boolean;
	showLearnMore?: boolean;
	description?: string;
};

export type WebsiteConfig = {
	schemaVersion?: number;
	pages?: WebsiteConfigPage[];
	forms?: Record<string, unknown>[];
	theme?: Record<string, unknown>;
	footer?: Record<string, unknown>;
	locale?: string;
	content?: {
		programs?: WebsiteConfigProgram[];
		[key: string]: unknown;
	};
	business?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	navigation?: Record<string, unknown>[];
	capabilities?: Record<string, unknown>;
	locationConnections?: Record<string, unknown>;
};

export type WebsiteSite = typeof websiteSites.$inferSelect & {
	vendor?: Vendor;
	locations?: WebsiteSiteLocation[];
	revisions?: WebsiteSiteRevision[];
	draft?: WebsiteSiteDraft;
	domains?: WebsiteSiteDomain[];
};

export type WebsiteSiteLocation = typeof websiteSiteLocations.$inferSelect & {
	site?: WebsiteSite;
	location?: Location;
};

export type WebsiteSiteRevision = typeof websiteSiteRevisions.$inferSelect & {
	config: WebsiteConfig;
	site?: WebsiteSite;
};

export type WebsiteSiteDraft = typeof websiteSiteDrafts.$inferSelect & {
	site?: WebsiteSite;
};

export type WebsiteSiteDomain = typeof websiteSiteDomains.$inferSelect & {
	site?: WebsiteSite;
};
