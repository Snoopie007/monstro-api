import { adsSettings } from "../schemas/ads";
import type { Integration } from "./integrations";

export type AdsMode = "simple" | "advance";

export type AdsSetupPhase = "prepare" | "brand";
export type AdsPrepareTask = "conversions" | "assets" | "gbp";

export type AdsSetupProgress = {
	current?: AdsSetupPhase;
	conversions?: boolean;
	assets?: boolean;
	gbp?: boolean;
	error?: string;
	brand?: boolean;
	conquest?: boolean;
};

export type AdsSettingsRules = Record<string, unknown>;

export type AdsSettings = typeof adsSettings.$inferSelect & {
	integration?: Integration;
};
