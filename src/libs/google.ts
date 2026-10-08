import { enums, errors, GoogleAdsApi, ResourceNames, toMicros } from "google-ads-api";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type AdwordsConversionAction = { id: string; name: string };

export const MX_CONVERSIONS = [
    {
        name: "MX Lead",
        category: enums.ConversionActionCategory.SUBMIT_LEAD_FORM,
        primary: true,
        countingType: enums.ConversionActionCountingType.ONE_PER_CLICK,
    },
    {
        name: "MX Appointment",
        category: enums.ConversionActionCategory.BOOK_APPOINTMENT,
        primary: true,
        countingType: enums.ConversionActionCountingType.ONE_PER_CLICK,
    },
    {
        name: "MX View Content",
        category: enums.ConversionActionCategory.PAGE_VIEW,
        primary: false,
        countingType: enums.ConversionActionCountingType.MANY_PER_CLICK,
    },
] as const;

export function adsCustomer(customerId: string, refreshToken: string, loginCustomerId?: string) {
    return new GoogleAdsApi({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    }).Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
        ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}),
    });
}

export function adsEnum(value: unknown, enumObj: Record<string | number, string | number>) {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && typeof enumObj[value] === "string") {
        return enumObj[value];
    }
    return String(value ?? "");
}

export function adsErrorMessage(error: unknown, fallback: string) {
    if (error instanceof errors.GoogleAdsFailure) {
        return error.errors[0]?.message || fallback;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function conversionActionId(resourceName: string) {
    return resourceName.split("/").pop() ?? "";
}

function createdConversionActionId(response: unknown) {
    const row = (response ?? {}) as {
        results?: Array<{ resource_name?: string; resourceName?: string }>;
        mutate_operation_responses?: Array<{
            conversion_action_result?: { resource_name?: string };
        }>;
        mutateOperationResponses?: Array<{
            conversionActionResult?: { resourceName?: string; resource_name?: string };
        }>;
    };
    const fromResults = row.results?.[0]?.resource_name ?? row.results?.[0]?.resourceName;
    if (fromResults) return conversionActionId(String(fromResults));

    const fromMutate =
        row.mutate_operation_responses?.[0]?.conversion_action_result?.resource_name
        ?? row.mutateOperationResponses?.[0]?.conversionActionResult?.resourceName
        ?? row.mutateOperationResponses?.[0]?.conversionActionResult?.resource_name;
    if (fromMutate) return conversionActionId(String(fromMutate));
    return "";
}

export async function ensureMxConversionActions(
    customerId: string,
    refreshToken: string,
    loginCustomerId?: string,
): Promise<AdwordsConversionAction[]> {
    const customer = adsCustomer(customerId, refreshToken, loginCustomerId);
    const rows = await customer.query(`
		SELECT
			conversion_action.id,
			conversion_action.name,
			conversion_action.status,
			conversion_action.resource_name
		FROM conversion_action
	`);

    const existing = new Map<string, { id: string; status: string; resourceName: string }>();
    for (const row of rows) {
        const name = row.conversion_action?.name;
        if (!name) continue;
        existing.set(name, {
            id: String(row.conversion_action?.id ?? ""),
            status: adsEnum(row.conversion_action?.status, enums.ConversionActionStatus),
            resourceName: String(row.conversion_action?.resource_name ?? ""),
        });
    }

    const actions: AdwordsConversionAction[] = [];

    for (const spec of MX_CONVERSIONS) {
        const found = existing.get(spec.name);
        if (found && found.status !== "REMOVED") {
            actions.push({ id: found.id, name: spec.name });
            continue;
        }

        if (found?.resourceName) {
            await customer.conversionActions.update([{
                resource_name: found.resourceName,
                status: enums.ConversionActionStatus.ENABLED,
            }]);
            actions.push({ id: found.id, name: spec.name });
            continue;
        }

        const created = await customer.conversionActions.create([{
            name: spec.name,
            type: enums.ConversionActionType.WEBPAGE,
            category: spec.category,
            status: enums.ConversionActionStatus.ENABLED,
            primary_for_goal: spec.primary,
            counting_type: spec.countingType,
            click_through_lookback_window_days: 30,
            view_through_lookback_window_days: 1,
            value_settings: {
                default_value: 0,
                always_use_default_value: true,
            },
        }]);

        let id = createdConversionActionId(created);
        if (!id) {
            const createdRows = await customer.query(`
				SELECT conversion_action.id
				FROM conversion_action
				WHERE conversion_action.name = '${spec.name}'
			`);
            id = String(createdRows[0]?.conversion_action?.id ?? "");
        }
        if (!id) throw new Error(`Failed to create conversion action ${spec.name}`);
        actions.push({ id, name: spec.name });
    }

    return actions;
}

export class AdsSetupError extends Error {
    readonly status: 400 | 404;
    constructor(message: string, status: 400 | 404 = 400) {
        super(message);
        this.name = "AdsSetupError";
        this.status = status;
    }
}

export type AdsSitelinkProgram = {
    name: string;
    slug: string;
};

export type AdsLocationAssets = {
    website?: string;
    phone?: string;
    country?: string;
    pages?: Array<{ pageKey: string; path: string }>;
    /** Visible site programs with a /programs/{slug} page (showLearnMore). */
    programs?: AdsSitelinkProgram[];
};

export type EnsuredAdsAssets = {
    sitelinks: string[];
    call: string | null;
    callouts: string[];
};

const MX_CALLOUTS = [
    "Book a Trial",
] as const;

export function toWebsiteOrigin(website?: string | null) {
    if (!website) return null;
    const withProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    try {
        const url = new URL(withProtocol);
        if (!url.hostname) return null;
        return `${url.protocol}//${url.host}`;
    } catch {
        return null;
    }
}

/** Convert stored E.164 (or similar) into Google Ads CallAsset country + national number. */
export function parseCallPhone(phone?: string, country?: string) {
    if (!phone?.trim()) return null;
    const defaultCountry = (country?.trim().toUpperCase() || "US") as CountryCode;
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    if (!parsed?.isValid() || !parsed.country) return null;
    return {
        country_code: parsed.country,
        phone_number: parsed.nationalNumber,
    };
}

function clip(value: string, max: number) {
    return value.trim().slice(0, max);
}

function joinUrl(origin: string, path: string) {
    if (path === "/") return `${origin}/`;
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function pagePath(pages: Array<{ pageKey: string; path: string }>, pageKey: string) {
    const path = pages.find((page) => page.pageKey === pageKey)?.path?.trim();
    return path || null;
}

/** Account sitelinks: Tour + Reviews (home), Pricing (always), each program page. */
export function mxSitelinkSpecs(
    origin: string,
    pages: Array<{ pageKey: string; path: string }> = [],
    programs: AdsSitelinkProgram[] = [],
) {
    const home = pagePath(pages, "home") || "/";
    // Pricing page is expected on every site; fall back to /pricing if missing from config.
    const pricing = pagePath(pages, "pricing") || "/pricing";

    const links = [
        { linkText: "Tour", url: joinUrl(origin, home) },
        { linkText: "Reviews", url: joinUrl(origin, home) },
        { linkText: "Pricing", url: joinUrl(origin, pricing) },
    ];

    // One sitelink per program that has a public /programs/{slug} page.
    for (const program of programs) {
        const slug = program.slug?.trim();
        const name = clip(program.name, 25);
        if (!slug || !name) continue;
        links.push({
            linkText: name,
            url: joinUrl(origin, `/programs/${slug}`),
        });
    }

    return links;
}

type MxAssetOp = {
    entity: "asset" | "customer_asset";
    operation: "create";
    resource: Record<string, unknown>;
};

type IndexedMxAssets = {
    sitelinkByText: Map<string, string>;
    calloutByText: Map<string, string>;
    callResourceName: string;
};

function indexExistingMxAssets(assetRows: Array<{ asset?: Record<string, any> | null }>): IndexedMxAssets {
    const sitelinkByText = new Map<string, string>();
    const calloutByText = new Map<string, string>();
    let callResourceName = "";

    for (const row of assetRows) {
        const resourceName = String(row.asset?.resource_name ?? "");
        if (!resourceName) continue;
        const type = adsEnum(row.asset?.type, enums.AssetType);
        const sitelinkText = row.asset?.sitelink_asset?.link_text?.trim().toLowerCase();
        if (type === "SITELINK" && sitelinkText) sitelinkByText.set(sitelinkText, resourceName);
        const calloutText = row.asset?.callout_asset?.callout_text?.trim().toLowerCase();
        if (type === "CALLOUT" && calloutText) calloutByText.set(calloutText, resourceName);
        const phone = row.asset?.call_asset?.phone_number?.replace(/\D/g, "");
        if (type === "CALL" && phone) callResourceName ||= resourceName;
    }

    return { sitelinkByText, calloutByText, callResourceName };
}

export async function ensureMxAssets(
    customerId: string,
    refreshToken: string,
    location: AdsLocationAssets,
    loginCustomerId?: string,
): Promise<EnsuredAdsAssets> {
    const customer = adsCustomer(customerId, refreshToken, loginCustomerId);
    const cid = customer.credentials.customer_id;
    // Sitelinks need final_urls — skip them when the location has no website.
    const origin = toWebsiteOrigin(location.website);
    const sitelinks = origin
        ? mxSitelinkSpecs(origin, location.pages, location.programs)
        : [];
    const call = parseCallPhone(location.phone, location.country);

    // Load existing assets + customer links so re-runs reuse instead of duplicating.
    const [assetRows, linkedRows] = await Promise.all([
        customer.query(`
			SELECT
				asset.resource_name,
				asset.type,
				asset.sitelink_asset.link_text,
				asset.call_asset.phone_number,
				asset.callout_asset.callout_text
			FROM asset
			WHERE asset.type IN ('SITELINK', 'CALL', 'CALLOUT')
		`),
        customer.query(`
			SELECT
				customer_asset.asset,
				customer_asset.field_type,
				customer_asset.status
			FROM customer_asset
			WHERE customer_asset.status != 'REMOVED'
		`),
    ]);

    const linked = new Set(
        linkedRows.map((row) => String(row.customer_asset?.asset ?? "")).filter(Boolean),
    );
    const existing = indexExistingMxAssets(assetRows);

    const operations: MxAssetOp[] = [];
    // Negative temp IDs let create+link land in one mutateResources batch.
    let tempId = 1;
    const ensuredSitelinks: string[] = [];
    const ensuredCallouts: string[] = [];

    const linkCustomerAsset = (asset: string, fieldType: number) => {
        if (linked.has(asset)) return;
        operations.push({
            entity: "customer_asset",
            operation: "create",
            resource: { asset, field_type: fieldType },
        });
        linked.add(asset);
    };

    const ensureNamedAsset = (
        byKey: Map<string, string>,
        key: string,
        fieldType: number,
        build: (resourceName: string) => Record<string, unknown>,
    ) => {
        const existingName = byKey.get(key.toLowerCase());
        if (existingName) {
            linkCustomerAsset(existingName, fieldType);
            return;
        }
        const resourceName = ResourceNames.asset(cid, String(-tempId));
        tempId += 1;
        operations.push({
            entity: "asset",
            operation: "create",
            resource: build(resourceName),
        });
        linkCustomerAsset(resourceName, fieldType);
        byKey.set(key.toLowerCase(), resourceName);
    };

    for (const spec of sitelinks) {
        ensureNamedAsset(
            existing.sitelinkByText,
            spec.linkText,
            enums.AssetFieldType.SITELINK,
            (resourceName) => ({
                resource_name: resourceName,
                name: `MX ${spec.linkText}`,
                final_urls: [spec.url],
                sitelink_asset: { link_text: spec.linkText },
            }),
        );
        ensuredSitelinks.push(spec.linkText);
    }

    for (const text of MX_CALLOUTS) {
        ensureNamedAsset(
            existing.calloutByText,
            text,
            enums.AssetFieldType.CALLOUT,
            (resourceName) => ({
                resource_name: resourceName,
                name: `MX ${text}`,
                callout_asset: { callout_text: text },
            }),
        );
        ensuredCallouts.push(text);
    }

    // Call: link-or-create only (does not update phone if a CALL asset already exists).
    let ensuredCall: string | null = null;
    if (call) {
        if (existing.callResourceName) {
            linkCustomerAsset(existing.callResourceName, enums.AssetFieldType.CALL);
        } else {
            const resourceName = ResourceNames.asset(cid, String(-tempId));
            tempId += 1;
            operations.push({
                entity: "asset",
                operation: "create",
                resource: {
                    resource_name: resourceName,
                    name: "MX Call",
                    call_asset: call,
                },
            });
            linkCustomerAsset(resourceName, enums.AssetFieldType.CALL);
            existing.callResourceName = resourceName;
        }
        ensuredCall = call.phone_number;
    }

    if (operations.length) await customer.mutateResources(operations);

    return {
        sitelinks: ensuredSitelinks,
        call: ensuredCall,
        callouts: ensuredCallouts,
    };
}

export type AdsLocationAsset = {
    resourceName: string;
    placeId: string | null;
};

export async function findAdsLocationAsset(
    customerId: string,
    refreshToken: string,
    loginCustomerId?: string,
): Promise<AdsLocationAsset | null> {
    const customer = adsCustomer(customerId, refreshToken, loginCustomerId);
    const rows = await customer.query(`
		SELECT
			asset.resource_name,
			asset.location_asset.place_id
		FROM asset
		WHERE asset.type = 'LOCATION'
	`);

    const row = rows[0];
    const resourceName = row?.asset?.resource_name;
    if (!resourceName) return null;
    const placeId = row.asset?.location_asset?.place_id?.trim() || null;
    return { resourceName: String(resourceName), placeId };
}

export const BRAND_KEYWORD_MATCH_TYPES = ["EXACT", "PHRASE", "BROAD"] as const;
export type BrandKeywordMatchType = (typeof BRAND_KEYWORD_MATCH_TYPES)[number];
export type BrandKeyword = { text: string; matchType: BrandKeywordMatchType };

export function mxBrandCampaignName(locationName: string) {
    return clip(`MX Brand - ${locationName}`, 255);
}

export function seedBrandKeywords(location: {
    name: string;
    legalName?: string | null;
    city?: string | null;
}) {
    const seeds: string[] = [];
    const push = (value?: string | null) => {
        const text = value?.trim();
        if (!text) return;
        seeds.push(text);
    };
    push(location.name);
    if (location.legalName?.trim() && location.legalName.trim().toLowerCase() !== location.name.trim().toLowerCase()) {
        push(location.legalName);
    }
    if (location.city?.trim()) push(`${location.name} ${location.city}`);
    return seeds;
}

export function expandBrandMatchTypes(keywords: string[]): BrandKeyword[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of keywords) {
        const text = raw.trim().replace(/["[\]]/g, "").replace(/\s+/g, " ");
        if (text.length < 2 || text.length > 80) continue;
        if (text.split(" ").length > 10) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(text.toLowerCase());
    }
    return unique.flatMap((text) =>
        BRAND_KEYWORD_MATCH_TYPES.map((matchType) => ({ text, matchType })),
    );
}

export function uniqueAdAssetTexts(texts: string[], maxLen: number, maxCount: number) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of texts) {
        const text = clip(raw, maxLen);
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(text);
        if (unique.length >= maxCount) break;
    }
    return unique;
}

function gaqlEscape(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function mutateResourceId(response: unknown, kind: string) {
    const row = (response ?? {}) as {
        results?: Array<{ resource_name?: string; resourceName?: string }>;
        mutate_operation_responses?: Array<Record<string, { resource_name?: string } | undefined>>;
        mutateOperationResponses?: Array<Record<string, { resourceName?: string; resource_name?: string } | undefined>>;
    };
    for (const result of row.results ?? []) {
        const name = String(result.resource_name ?? result.resourceName ?? "");
        const match = name.match(new RegExp(`/${kind}/(\\d+)$`));
        if (match) return match[1];
    }
    for (const result of row.mutate_operation_responses ?? []) {
        for (const value of Object.values(result)) {
            const name = String(value?.resource_name ?? "");
            const match = name.match(new RegExp(`/${kind}/(\\d+)$`));
            if (match) return match[1];
        }
    }
    for (const result of row.mutateOperationResponses ?? []) {
        for (const value of Object.values(result)) {
            const name = String(value?.resourceName ?? value?.resource_name ?? "");
            const match = name.match(new RegExp(`/${kind}/(\\d+)$`));
            if (match) return match[1];
        }
    }
    return "";
}

function keywordMatchType(matchType: BrandKeywordMatchType) {
    if (matchType === "EXACT") return enums.KeywordMatchType.EXACT;
    if (matchType === "PHRASE") return enums.KeywordMatchType.PHRASE;
    return enums.KeywordMatchType.BROAD;
}

export type BrandCampaignProps = {
    customerId: string;
    refreshToken: string;
    loginCustomerId?: string;
    locationName: string;
    finalUrl: string;
    keywords: BrandKeyword[];
    headlines: string[];
    descriptions: string[];
    dailyBudgetMicros?: number;
};

export type BrandCampaignResult = {
    campaignId: string;
    reused: boolean;
    campaignName: string;
    finalUrl: string;
    keywords: BrandKeyword[];
    headlines: string[];
    descriptions: string[];
};

type BrandCampaignOperation = {
    entity: "campaign_budget" | "campaign" | "ad_group" | "ad_group_ad" | "ad_group_criterion";
    operation: "create";
    resource: Record<string, unknown>;
};

export async function createBrandCampaign(
    input: BrandCampaignProps,
): Promise<BrandCampaignResult> {
    const headlines = uniqueAdAssetTexts(input.headlines, 30, 15);
    const descriptions = uniqueAdAssetTexts(input.descriptions, 90, 4);
    if (headlines.length < 3) throw new AdsSetupError("Need at least 3 unique headlines");
    if (descriptions.length < 2) throw new AdsSetupError("Need at least 2 unique descriptions");
    if (!input.keywords.length) throw new AdsSetupError("Need at least one brand keyword");

    const campaignName = mxBrandCampaignName(input.locationName);
    const customer = adsCustomer(input.customerId, input.refreshToken, input.loginCustomerId);
    const existing = await customer.query(`
		SELECT
			campaign.id,
			campaign.resource_name,
			campaign.status
		FROM campaign
		WHERE campaign.name = '${gaqlEscape(campaignName)}'
			AND campaign.status != 'REMOVED'
	`);
    const existingId = String(existing[0]?.campaign?.id ?? "");
    if (existingId) {
        return {
            campaignId: existingId,
            reused: true,
            campaignName,
            finalUrl: input.finalUrl,
            keywords: input.keywords,
            headlines,
            descriptions,
        };
    }

    const cid = customer.credentials.customer_id;
    const budgetRn = ResourceNames.campaignBudget(cid, "-1");
    const campaignRn = ResourceNames.campaign(cid, "-2");
    const adGroupRn = ResourceNames.adGroup(cid, "-3");
    const dailyBudgetMicros = input.dailyBudgetMicros && input.dailyBudgetMicros >= 1_000_000
        ? input.dailyBudgetMicros
        : toMicros(10);

    const operations: BrandCampaignOperation[] = [
        {
            entity: "campaign_budget",
            operation: "create",
            resource: {
                resource_name: budgetRn,
                name: clip(`MX Brand budget - ${input.locationName}`, 255),
                amount_micros: dailyBudgetMicros,
                delivery_method: enums.BudgetDeliveryMethod.STANDARD,
                explicitly_shared: false,
            },
        },
        {
            entity: "campaign",
            operation: "create",
            resource: {
                resource_name: campaignRn,
                name: campaignName,
                advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
                status: enums.CampaignStatus.PAUSED,
                campaign_budget: budgetRn,
                contains_eu_political_advertising:
                    enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
                manual_cpc: { enhanced_cpc_enabled: false },
                network_settings: {
                    target_google_search: true,
                    target_search_network: true,
                    target_content_network: false,
                },
            },
        },
        {
            entity: "ad_group",
            operation: "create",
            resource: {
                resource_name: adGroupRn,
                name: "Brand",
                campaign: campaignRn,
                status: enums.AdGroupStatus.ENABLED,
                type: enums.AdGroupType.SEARCH_STANDARD,
                cpc_bid_micros: toMicros(1),
            },
        },
        {
            entity: "ad_group_ad",
            operation: "create",
            resource: {
                ad_group: adGroupRn,
                status: enums.AdGroupAdStatus.ENABLED,
                ad: {
                    final_urls: [input.finalUrl],
                    responsive_search_ad: {
                        headlines: headlines.map((text) => ({ text })),
                        descriptions: descriptions.map((text) => ({ text })),
                    },
                },
            },
        },
        ...input.keywords.map((keyword) => ({
            entity: "ad_group_criterion" as const,
            operation: "create" as const,
            resource: {
                ad_group: adGroupRn,
                status: enums.AdGroupCriterionStatus.ENABLED,
                keyword: {
                    text: keyword.text,
                    match_type: keywordMatchType(keyword.matchType),
                },
            },
        })),
    ];
    const result = await customer.mutateResources(operations);

    let campaignId = mutateResourceId(result, "campaigns");
    if (!campaignId) {
        const created = await customer.query(`
			SELECT campaign.id
			FROM campaign
			WHERE campaign.name = '${gaqlEscape(campaignName)}'
				AND campaign.status != 'REMOVED'
		`);
        campaignId = String(created[0]?.campaign?.id ?? "");
    }
    if (!campaignId) throw new Error("Failed to create brand campaign");

    return {
        campaignId,
        reused: false,
        campaignName,
        finalUrl: input.finalUrl,
        keywords: input.keywords,
        headlines,
        descriptions,
    };
}
