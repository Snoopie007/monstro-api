import { expect, test } from "bun:test";
import {
  assembleSiteConfig,
  materializeSiteTemplate,
  splitSiteConfig,
  publicSiteConfig,
} from "./siteDraftConfig";

const template = {
  schemaVersion: 2,
  locale: "en-US",
  business: {
    name: "{{businessName}}",
    tagline: "Train in {{city}}",
    structuredDataType: "LocalBusiness",
  },
  metadata: {
    defaultTitle: "{{businessName}}",
    titleTemplate: "%s | {{businessName}}",
    defaultDescription: "Train well",
  },
  theme: {
    colors: {
      primary: "#000000",
      background: "#ffffff",
      foreground: "#111827",
      muted: "#64748b",
      accent: "#dbeafe",
    },
    typography: { heading: "sans", body: "sans" },
    radius: "medium",
  },
  navigation: [],
  footer: { credit: "", links: [] },
  content: { programs: [], teams: [], testimonials: [], faqs: [] },
  pages: [{
    id: "home",
    kind: "sections",
    path: "/",
    visible: true,
    header: { mode: "sticky", contrast: "light" },
    metadata: { title: "{{businessName}}" },
    sections: [{
      id: "home-hero",
      type: "hero",
      visible: true,
      props: { title: "Welcome to {{businessName}}", description: "Train well" },
    }],
  }, {
    id: "blog",
    kind: "builtin",
    path: "/blog",
    visible: true,
    metadata: { title: "Blog" },
  }],
  forms: [],
  capabilities: {
    blog: true,
    commerce: false,
    schedules: false,
    downloads: false,
    memberAuth: false,
  },
};

test("materializes, splits, and rebuilds a site template without changing its contract", () => {
  const config = materializeSiteTemplate(template, {
    businessName: "Academy",
    businessSlug: "academy",
    city: "Austin",
    primaryColor: "#2563eb",
  });
  const stored = splitSiteConfig(config);
  expect(stored.pages[0]?.settings).toEqual({
    header: { mode: "sticky", contrast: "light" },
  });
  expect(stored.pages[0]?.metadata).not.toHaveProperty("header");
  const pages = stored.pages.map((page, index) => ({ ...page, id: `page-${index}` }));
  const pageIds = new Map(pages.map((page) => [page.pageKey, page.id]));
  const blocks = stored.pages.flatMap((page) => page.blocks.map((block) => ({
    ...block,
    pageId: pageIds.get(page.pageKey)!,
  })));

  expect(assembleSiteConfig({
    schemaVersion: stored.schemaVersion,
    settings: stored.settings,
    pages,
    blocks,
  })).toEqual(config);
});

test("keeps credentials in stored settings but removes them from public config", () => {
  const credentials = {
    privateIntegrationToken: "pit-private",
    locationId: "ghl-location",
  };
  const stored = splitSiteConfig({
    ...template,
    integrations: { ghl: credentials },
  });

  expect(stored.settings.integrations).toEqual({ ghl: credentials });
  expect(publicSiteConfig({
    ...template,
    integrations: { ghl: credentials },
  })).not.toHaveProperty("integrations");
});

test("round trips public scripts and embeds through site settings", () => {
  const scriptsAndEmbeds = {
    enabled: true,
    entries: [{
      id: "primary-tags",
      name: "Primary tags",
      enabled: true,
      purpose: "analytics",
      kind: "gtm",
      containerId: "GTM-ABC123",
    }],
  };
  const stored = splitSiteConfig({ ...template, scriptsAndEmbeds });
  const pages = stored.pages.map((page, index) => ({ ...page, id: `page-scripts-${index}` }));
  const pageIds = new Map(pages.map((page) => [page.pageKey, page.id]));
  const blocks = stored.pages.flatMap((page) => page.blocks.map((block) => ({
    ...block,
    pageId: pageIds.get(page.pageKey)!,
  })));
  const rebuilt = assembleSiteConfig({
    schemaVersion: stored.schemaVersion,
    settings: stored.settings,
    pages,
    blocks,
  });

  expect(stored.settings.scriptsAndEmbeds).toEqual(scriptsAndEmbeds);
  expect(rebuilt).toEqual(expect.objectContaining({ scriptsAndEmbeds }));
  expect(publicSiteConfig(rebuilt)).toEqual(expect.objectContaining({ scriptsAndEmbeds }));
});

test("rejects a config outside the canonical site contract", () => {
  expect(() => splitSiteConfig({
    schemaVersion: 2,
    pages: template.pages,
  })).toThrow();
});
