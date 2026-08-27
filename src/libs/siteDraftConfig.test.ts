import { expect, test } from "bun:test";
import {
  PublicSiteConfigSchema,
  PublishableStoredSiteConfigSchema,
  storedSiteConfigFromStored,
} from "@subtrees/site-config.js";
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

function publishableConfig(input: unknown) {
  const stored = storedSiteConfigFromStored(input, "scale", [{
    locationId: "location-1",
    isPrimary: true,
    displayOrder: 0,
  }]);
  return PublishableStoredSiteConfigSchema.parse({
    ...stored,
    locationConnections: stored.locationConnections.map((connection) => ({
      ...connection,
      leadRouting: {
        ghlLocationId: connection.leadRouting.ghlLocationId || "ghl-location-1",
        privateIntegrationToken: connection.leadRouting.privateIntegrationToken || "pit-test-1",
      },
    })),
  });
}

test("materializes, splits, and rebuilds a site template without changing its contract", () => {
  const publicConfig = materializeSiteTemplate(template, {
    businessName: "Academy",
    businessSlug: "academy",
    city: "Austin",
    primaryColor: "#2563eb",
  });
  const config = publishableConfig(publicConfig);
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

test("round trips section image presentation through page settings", () => {
  const target = {
    kind: "section",
    sectionId: "home-hero",
    slot: "image",
  };
  const configured = {
    ...template,
    pages: template.pages.map((page) => page.id === "home"
      ? {
          ...page,
          sections: page.sections?.map((section) => ({
            ...section,
            presentation: {
              imageOverrides: [{
                target,
                fit: "contain",
                position: "top",
              }],
            },
          })),
        }
      : page),
  };
  const config = publishableConfig(configured);
  const stored = splitSiteConfig(config);
  const pages = stored.pages.map((page, index) => ({
    ...page,
    id: `page-presentation-${index}`,
  }));
  const pageIds = new Map(pages.map((page) => [page.pageKey, page.id]));
  const blocks = stored.pages.flatMap((page) => page.blocks.map((block) => ({
    ...block,
    pageId: pageIds.get(page.pageKey)!,
  })));

  expect(stored.pages[0]?.settings).toEqual({
    header: { mode: "sticky", contrast: "light" },
    sectionPresentations: {
      "home-hero": {
        imageOverrides: [{ target, fit: "contain", position: "top" }],
      },
    },
  });
  expect(assembleSiteConfig({
    schemaVersion: stored.schemaVersion,
    settings: stored.settings,
    pages,
    blocks,
  })).toEqual(config);
});

test("stores a legacy GFO page as editable blocks and rebuilds valid config", () => {
  const config = publishableConfig({
    business: { name: "Academy", tagline: "Train well" },
    pages: {
      gfo: {
        kind: "builtin",
        path: "/lp/gfo",
        visible: true,
        metadata: {
          title: "Special Offer",
          description: "Claim this offer.",
        },
        props: {
          notice: "Your starter kit is on the way.",
          title: "Try two weeks for $39",
          description: "Meet the coaches and try a class.",
          videoSrc: "",
          claimOfferLabel: "Claim Offer",
          claimOfferHref: "/get-started",
        },
      },
    },
  });
  const stored = splitSiteConfig(config);
  const gfoPage = stored.pages.find((page) => page.pageKey === "gfo");

  expect(gfoPage).toEqual(expect.objectContaining({
    path: "/lp/gfo",
    kind: "sections",
  }));
  expect(gfoPage?.blocks).toEqual([
    expect.objectContaining({
      blockKey: "gfo-offer",
      type: "gfo_offer",
      props: expect.not.objectContaining({ video: expect.anything() }),
    }),
    expect.objectContaining({
      blockKey: "gfo-testimonials",
      type: "testimonials",
    }),
  ]);

  const pages = stored.pages.map((page, index) => ({
    ...page,
    id: `page-gfo-${index}`,
  }));
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

  expect(PublishableStoredSiteConfigSchema.safeParse(rebuilt).success).toBe(true);
  expect(rebuilt).toEqual(config);
});

test("keeps credentials in stored settings but removes them from public config", () => {
  const credentials = {
    privateIntegrationToken: "pit-private",
    locationId: "ghl-location",
  };
  const config = publishableConfig({
    ...template,
    integrations: { ghl: credentials },
  });
  const stored = splitSiteConfig(config);

  expect(stored.settings.locationConnections).toEqual([expect.objectContaining({
    locationId: "location-1",
    leadRouting: {
      ghlLocationId: "ghl-location",
      privateIntegrationToken: "pit-private",
    },
  })]);
  const publicConfig = publicSiteConfig(config) as Record<string, unknown>;
  expect(publicConfig).not.toHaveProperty("integrations");
  expect(JSON.stringify(publicConfig)).not.toContain("pit-private");
  expect((publicConfig.locationConnections as Array<Record<string, unknown>>)[0])
    .not.toHaveProperty("leadRouting");
});

test("rejects malformed stored configs instead of returning private routing data", () => {
  const config = publishableConfig({
    ...template,
    integrations: {
      ghl: {
        privateIntegrationToken: "pit-private",
        locationId: "ghl-location",
      },
    },
  });

  expect(() => publicSiteConfig({ ...config, unexpected: true })).toThrow();
});

test("round trips public scripts and embeds through site settings", () => {
  const scriptsAndEmbeds = PublicSiteConfigSchema.parse({
    ...template,
    scriptsAndEmbeds: {
      enabled: true,
      entries: [{
        id: "primary-tags",
        name: "Primary tags",
        enabled: true,
        purpose: "analytics",
        kind: "gtm",
        containerId: "GTM-ABC123",
      }, {
        id: "support-widget",
        name: "Support widget",
        enabled: true,
        purpose: "functional",
        kind: "custom",
        placement: "body_end",
        parts: [
          { type: "markup", html: '<div id="support-root"></div>' },
          {
            type: "external_script",
            src: "https://chat.example.com/widget.js",
            attributes: { async: true },
          },
        ],
      }],
    },
  }).scriptsAndEmbeds;
  const stored = splitSiteConfig(publishableConfig({ ...template, scriptsAndEmbeds }));
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

test("round trips site-only location overrides through site settings", () => {
  const locationOverride = {
    name: "Downtown Academy",
    mapQuery: "Downtown Academy, Austin, TX",
    address: {
      streetAddress: "123 Site St",
      addressLocality: "Austin",
      addressRegion: "TX",
      postalCode: "78701",
      addressCountry: "US",
    },
    phone: "555-111-1111",
    email: "site@example.com",
    hoursDescription: "Weekdays from 9 AM to 5 PM.",
  };
  const stored = splitSiteConfig(publishableConfig({ ...template, locationOverride }));
  const pages = stored.pages.map((page, index) => ({
    ...page,
    id: `page-location-${index}`,
  }));
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

  expect(stored.settings.locationConnections).toEqual([expect.objectContaining({
    override: locationOverride,
  })]);
  expect(rebuilt).toEqual(expect.objectContaining({
    locationConnections: [expect.objectContaining({ override: locationOverride })],
  }));
  expect(publicSiteConfig(rebuilt)).toEqual(expect.objectContaining({
    locationConnections: [expect.objectContaining({ override: locationOverride })],
  }));
});

test("rejects a config outside the canonical site contract", () => {
  expect(() => splitSiteConfig({
    schemaVersion: 2,
    pages: template.pages,
  })).toThrow();
});
