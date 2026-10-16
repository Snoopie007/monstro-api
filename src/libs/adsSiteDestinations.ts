import {
    publicSiteConfigFromStored,
    resolveProgramPage,
    StoredSiteConfigSchema,
    toPublicSiteConfig,
} from "@/subtrees/site-config.js";
import type { AdsLocationAssets } from "./google";

/**
 * Sitelink destinations for one Ads location from a published site revision.
 * Program links use each program's resolved detail page. A page pinned to
 * another connected location is left out; unpinned pages stay site-wide.
 */
export function publishedAdsDestinations(
    revisionConfig: unknown,
    plan: "growth" | "scale",
    locationId: string,
): Required<Pick<AdsLocationAssets, "pages" | "programs">> {
    const stored = StoredSiteConfigSchema.safeParse(revisionConfig);
    const config = stored.success
        ? toPublicSiteConfig(stored.data)
        : publicSiteConfigFromStored(revisionConfig, plan);
    const pages = config.pages
        .filter((page) => page.path && page.id)
        .map((page) => ({ pageKey: page.id, path: page.path }));
    const programs = config.content.programs
        .filter((program) => program.visible && program.showLearnMore && program.name)
        .flatMap((program) => {
            const resolution = resolveProgramPage(config.pages, program);
            if (resolution.status !== "resolved") return [];
            const page = resolution.page;
            if (
                page.kind === "sections" &&
                page.serviceLocationId &&
                page.serviceLocationId !== locationId
            ) return [];
            return [{ name: program.name, path: page.path }];
        });
    return { pages, programs };
}
