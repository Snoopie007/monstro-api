import {
  normalizeSiteConfigV2,
  PublicSiteConfigSchema,
  PublishableStoredSiteConfigSchema,
  StoredSiteConfigSchema,
  toPublicSiteConfig,
} from "@subtrees/site-config.js";

type JsonRecord = Record<string, unknown>;

export type StoredPageInput = {
  pageKey: string;
  path: string;
  kind: "sections" | "builtin";
  position: number;
  visible: boolean;
  metadata: JsonRecord;
  settings: JsonRecord;
  blocks: StoredBlockInput[];
};

export type StoredBlockInput = {
  blockKey: string;
  type: string;
  position: number;
  visible: boolean;
  props: JsonRecord;
};

export type StoredPageRow = Omit<StoredPageInput, "blocks"> & { id: string };
export type StoredBlockRow = StoredBlockInput & { pageId: string };

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}


export function splitSiteConfig(input: unknown) {
  const config = PublishableStoredSiteConfigSchema.parse(input);
  return splitParsedSiteConfig(config);
}

export function splitDraftSiteConfig(input: unknown) {
  const config = StoredSiteConfigSchema.parse(input);
  return splitParsedSiteConfig(config);
}

function splitParsedSiteConfig(
  config: ReturnType<typeof StoredSiteConfigSchema.parse>,
) {
  const pages = config.pages.map((page, position): StoredPageInput => ({
    pageKey: page.id,
    path: page.path,
    kind: page.kind,
    position,
    visible: page.visible,
    metadata: { ...page.metadata },
    settings: page.header ? { header: page.header } : {},
    blocks: page.kind === "sections"
      ? page.sections.map((section, blockPosition): StoredBlockInput => ({
          blockKey: section.id,
          type: section.type,
          position: blockPosition,
          visible: section.visible,
          props: { ...section.props },
        }))
      : [],
  }));
  const { pages: _pages, schemaVersion, ...settings } = config;
  return { config, schemaVersion, settings, pages };
}

export function assembleSiteConfig(input: {
  schemaVersion: number;
  settings: JsonRecord;
  pages: StoredPageRow[];
  blocks: StoredBlockRow[];
}): JsonRecord {
  const blocksByPage = new Map<string, StoredBlockRow[]>();
  for (const block of input.blocks) {
    const pageBlocks = blocksByPage.get(block.pageId) ?? [];
    pageBlocks.push(block);
    blocksByPage.set(block.pageId, pageBlocks);
  }

  const pages = [...input.pages]
    .sort((a, b) => a.position - b.position)
    .map((page) => {
      const header = page.settings.header;
      const base = {
        id: page.pageKey,
        kind: page.kind,
        path: page.path,
        visible: page.visible,
        metadata: page.metadata,
        ...(header === undefined ? {} : { header }),
      };
      if (page.kind === "builtin") return base;
      return {
        ...base,
        sections: (blocksByPage.get(page.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((block) => ({
            id: block.blockKey,
            type: block.type,
            visible: block.visible,
            props: block.props,
          })),
      };
    });

  return { ...input.settings, schemaVersion: input.schemaVersion, pages };
}

export function publicSiteConfig(input: unknown): unknown {
  const stored = StoredSiteConfigSchema.safeParse(input);
  if (stored.success) return toPublicSiteConfig(stored.data);
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const config = { ...input as JsonRecord };
  delete config.integrations;
  const parsed = PublicSiteConfigSchema.safeParse(normalizeSiteConfigV2(config));
  return parsed.success ? parsed.data : config;
}

function replaceTokens(value: unknown, replacements: Record<string, string>): unknown {
  if (typeof value === "string") {
    return Object.entries(replacements).reduce(
      (result, [token, replacement]) => result.replaceAll(token, replacement),
      value,
    );
  }
  if (Array.isArray(value)) return value.map((item) => replaceTokens(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceTokens(item, replacements)]),
    );
  }
  return value;
}

export function materializeSiteTemplate(
  payload: unknown,
  values: { businessName: string; businessSlug: string; city: string; primaryColor?: string },
): JsonRecord {
  const materialized = record(replaceTokens(payload, {
    "{{businessName}}": values.businessName,
    "{{businessSlug}}": values.businessSlug,
    "{{city}}": values.city,
  }), "Site template");

  if (values.primaryColor) {
    const theme = record(materialized.theme, "Site template theme");
    const colors = record(theme.colors, "Site template colors");
    materialized.theme = { ...theme, colors: { ...colors, primary: values.primaryColor } };
  }

  return PublicSiteConfigSchema.parse(normalizeSiteConfigV2(materialized));
}

export function draftToken(siteId: string, version: number): string {
  return `draft:${siteId}:${version}`;
}
