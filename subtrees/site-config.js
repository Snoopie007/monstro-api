// @bun
// src/config.ts
import { z as z33 } from "zod";

// src/collections.ts
import { z as z29 } from "zod";

// src/sections/index.ts
import { z as z28 } from "zod";

// src/sections/about.ts
import { z as z2 } from "zod";

// src/sections/primitives.ts
import { z } from "zod";
function isSiteHref(value) {
  if (value.startsWith("#"))
    return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
var SiteHrefSchema = z.string().min(1).refine(isSiteHref, "Link must be site-relative, an anchor, or HTTPS");
var SiteAssetSrcSchema = SiteHrefSchema.refine((value) => !value.startsWith("#"), "Asset URL must be site-relative or HTTPS");
var HttpsUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "URL must use HTTPS without embedded credentials");
var IFRAME_HOSTS = {
  video: ["youtube.com", "youtube-nocookie.com", "vimeo.com"],
  form: [
    "forms.gle",
    "docs.google.com",
    "form.jotform.com",
    "api.leadconnectorhq.com",
    "link.msgsndr.com"
  ],
  scheduler: ["calendly.com", "api.leadconnectorhq.com"],
  map: ["google.com"]
};
function isIframeUrlAllowed(value, policy) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password)
      return false;
    const hostname = url.hostname.toLowerCase();
    return IFRAME_HOSTS[policy].some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}
var SiteImageSchema = z.object({
  src: SiteAssetSrcSchema,
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
}).strict().superRefine((image, issue) => {
  if (image.width === undefined !== (image.height === undefined)) {
    issue.addIssue({
      code: "custom",
      message: "Image width and height must be provided together",
      path: ["width"]
    });
  }
});
var SiteLinkSchema = z.object({
  label: z.string().min(1),
  href: SiteHrefSchema,
  external: z.boolean().default(false),
  variant: z.enum(["primary", "secondary"]).default("primary")
}).strict();
var SectionIdentifierSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
var SectionBaseSchema = z.object({
  id: SectionIdentifierSchema,
  visible: z.boolean().default(true),
  anchor: SectionIdentifierSchema.optional()
});
var OrderedIdsSchema = z.array(z.string().min(1)).min(1).optional();
var SectionHeadingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1)
});

// src/sections/about.ts
var AboutSectionSchema = SectionBaseSchema.extend({
  type: z2.literal("about"),
  props: z2.object({
    image: SiteImageSchema.optional(),
    headline: z2.string().min(1),
    description: z2.array(z2.string().min(1)).min(1),
    bullets: z2.array(z2.object({
      title: z2.string().min(1),
      body: z2.string().min(1)
    }).strict())
  }).strict()
}).strict();

// src/sections/bottom-cta.ts
import { z as z3 } from "zod";
var BottomCtaSectionSchema = SectionBaseSchema.extend({
  type: z3.literal("bottom_cta"),
  props: SectionHeadingSchema.extend({
    title: z3.string(),
    description: z3.string(),
    variant: z3.enum(["full", "box"]).default("full"),
    image: SiteImageSchema.optional(),
    cta: SiteLinkSchema.optional()
  }).strict()
}).strict();

// src/sections/bottom-cta-form.ts
import { z as z5 } from "zod";

// src/forms.ts
import { z as z4 } from "zod";
var FormIdSchema = z4.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
var FieldNameSchema = z4.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_]*$/);
var RedirectTypeSchema = z4.enum(["page", "url"]);
var FormFieldSchema = z4.object({
  name: FieldNameSchema,
  type: z4.enum(["text", "textarea", "select"]),
  label: z4.string().min(1).max(200),
  required: z4.boolean().default(false),
  placeholder: z4.string().max(300).optional(),
  options: z4.array(z4.object({
    label: z4.string().min(1).max(200),
    value: z4.string().min(1).max(300),
    redirectTo: z4.string().max(2000).optional()
  }).strict()).max(100).optional(),
  rules: z4.object({
    minLength: z4.number().int().nonnegative().optional(),
    maxLength: z4.number().int().positive().optional(),
    format: z4.enum(["email"]).optional()
  }).strict().optional(),
  showWhen: z4.object({
    field: FieldNameSchema,
    equals: z4.string().max(1000)
  }).strict().optional()
}).strict().superRefine((field, issue) => {
  if (field.type === "select" && (!field.options || field.options.length === 0)) {
    issue.addIssue({ code: "custom", message: "Select fields require options", path: ["options"] });
  }
  if (field.type !== "select" && field.options !== undefined) {
    issue.addIssue({ code: "custom", message: "Only select fields may define options", path: ["options"] });
  }
  if (field.rules?.minLength !== undefined && field.rules.maxLength !== undefined && field.rules.minLength > field.rules.maxLength) {
    issue.addIssue({ code: "custom", message: "Minimum length cannot exceed maximum length", path: ["rules"] });
  }
});
var RedirectRuleSchema = z4.object({
  when: z4.object({
    field: FieldNameSchema,
    equals: z4.string().max(1000)
  }).strict(),
  redirectTo: z4.string().min(1).max(2000),
  redirectToType: RedirectTypeSchema.optional()
}).strict();
var NativeSiteFormSchema = z4.object({
  id: FormIdSchema,
  name: z4.string().min(1).max(200),
  title: z4.string().min(1).max(300).optional(),
  description: z4.string().max(2000).optional(),
  submitLabel: z4.string().min(1).max(100).optional(),
  thankYouMessage: z4.string().max(2000).optional(),
  redirectTo: z4.string().max(2000).optional(),
  redirectToType: RedirectTypeSchema.optional(),
  redirectRules: z4.union([z4.string(), z4.array(RedirectRuleSchema), z4.null()]).default(null),
  tags: z4.array(z4.string().min(1).max(200)).max(100).default([]),
  fields: z4.array(FormFieldSchema).min(1).max(100)
}).strict().superRefine((form, issue) => {
  const fields = new Map;
  for (const [index, field] of form.fields.entries()) {
    const previous = fields.get(field.name);
    if (previous !== undefined) {
      issue.addIssue({ code: "custom", message: `Duplicate field name: ${field.name}`, path: ["fields", index, "name"] });
    } else {
      fields.set(field.name, index);
    }
    if (field.showWhen) {
      const dependency = fields.get(field.showWhen.field);
      if (dependency === undefined || dependency >= index) {
        issue.addIssue({ code: "custom", message: "Conditional fields must reference an earlier field", path: ["fields", index, "showWhen", "field"] });
      }
    }
    if (field.type === "select" && field.options) {
      const optionValues = new Set;
      for (const [optionIndex, option] of field.options.entries()) {
        if (optionValues.has(option.value)) {
          issue.addIssue({ code: "custom", message: `Duplicate option value: ${option.value}`, path: ["fields", index, "options", optionIndex, "value"] });
        }
        optionValues.add(option.value);
      }
    }
  }
  if (Array.isArray(form.redirectRules)) {
    for (const [index, rule] of form.redirectRules.entries()) {
      if (!fields.has(rule.when.field)) {
        issue.addIssue({ code: "custom", message: `Unknown redirect field: ${rule.when.field}`, path: ["redirectRules", index, "when", "field"] });
      }
    }
  }
});
var IframeFormPlacementSchema = z4.object({
  kind: z4.literal("iframe"),
  src: HttpsUrlSchema,
  title: z4.string().min(1).max(200),
  height: z4.number().int().min(120).max(1200).default(600)
}).strict().superRefine((placement, issue) => {
  if (!isIframeUrlAllowed(placement.src, "form")) {
    issue.addIssue({ code: "custom", message: "Host is not allowed for form embeds", path: ["src"] });
  }
});
var FormPlacementSchema = z4.discriminatedUnion("kind", [
  z4.object({
    kind: z4.literal("native"),
    formId: FormIdSchema
  }).strict(),
  IframeFormPlacementSchema
]);
var FormValueSchema = z4.union([z4.string().max(1e4), z4.boolean()]);
var FormValuesSchema = z4.record(FieldNameSchema, FormValueSchema);
var FormSubmissionRequestSchema = z4.object({
  formId: FormIdSchema,
  nonce: z4.string().min(1).max(4000),
  values: FormValuesSchema
}).strict();
var FormSubmissionResponseSchema = z4.object({
  ok: z4.literal(true),
  message: z4.string(),
  redirectTo: z4.string().optional()
}).strict();
var SiteFormSchema = NativeSiteFormSchema;

// src/sections/bottom-cta-form.ts
var BottomCtaFormSectionSchema = SectionBaseSchema.extend({
  type: z5.literal("bottom_cta_form"),
  props: z5.object({
    source: FormPlacementSchema
  }).strict()
}).strict();

// src/sections/compare.ts
import { z as z6 } from "zod";
var CompareSectionSchema = SectionBaseSchema.extend({
  type: z6.literal("compare"),
  props: SectionHeadingSchema.extend({
    cards: z6.array(z6.object({
      title: z6.string().min(1),
      bullets: z6.array(z6.object({
        title: z6.string().min(1),
        description: z6.string().min(1)
      }).strict()).min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/contact-form.ts
import { z as z7 } from "zod";
var ContactFormSectionSchema = SectionBaseSchema.extend({
  type: z7.literal("contact_form_section"),
  props: SectionHeadingSchema.extend({
    eyebrow: z7.string().optional(),
    source: FormPlacementSchema,
    helpTitle: z7.string().min(1),
    helpDescription: z7.string().min(1),
    hoursTitle: z7.string().min(1),
    hoursDescription: z7.string().min(1)
  }).strict()
}).strict();

// src/sections/external-widget.ts
import { z as z8 } from "zod";
var WidgetSettingSchema = z8.string().trim().min(1).max(200).regex(/^[^<>"'\u0000-\u001F\u007F]+$/, "Widget settings cannot contain HTML control characters");
var GymdeskExternalWidgetSettingsSchema = z8.object({
  gymId: z8.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/, "Gymdesk gym ID is invalid"),
  visibleSchedule: WidgetSettingSchema.default("All Schedules"),
  defaultSchedule: WidgetSettingSchema.default("All Schedules"),
  program: WidgetSettingSchema.default("All Programs"),
  schedule: WidgetSettingSchema.optional(),
  theme: WidgetSettingSchema.optional()
}).strict();
var ExternalWidgetSectionPropsSchema = z8.discriminatedUnion("provider", [
  z8.object({
    provider: z8.literal("gymdesk"),
    title: z8.string().trim().min(1).max(200),
    description: z8.string().trim().min(1).max(1000).optional(),
    settings: GymdeskExternalWidgetSettingsSchema
  }).strict()
]);
var ExternalWidgetSectionSchema = SectionBaseSchema.extend({
  type: z8.literal("external_widget"),
  props: ExternalWidgetSectionPropsSchema
}).strict();

// src/sections/faqs.ts
import { z as z9 } from "zod";
var FaqsSectionSchema = SectionBaseSchema.extend({
  type: z9.literal("faqs"),
  props: SectionHeadingSchema.extend({
    source: z9.literal("all-visible").optional(),
    faqIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/form.ts
import { z as z10 } from "zod";
var FormSectionSchema = SectionBaseSchema.extend({
  type: z10.literal("form"),
  props: z10.object({
    source: FormPlacementSchema,
    title: z10.string().min(1).optional(),
    description: z10.string().min(1).optional()
  }).strict()
}).strict();

// src/sections/gallery.ts
import { z as z11 } from "zod";
var GallerySectionSchema = SectionBaseSchema.extend({
  type: z11.literal("gallery"),
  props: SectionHeadingSchema.extend({
    images: z11.array(SiteImageSchema).min(1)
  }).strict()
}).strict();

// src/sections/hero.ts
import { z as z12 } from "zod";
var HeroSectionSchema = SectionBaseSchema.extend({
  type: z12.literal("hero"),
  props: z12.object({
    eyebrow: z12.string().optional(),
    title: z12.string().min(1),
    description: z12.string().min(1),
    image: SiteImageSchema.optional(),
    primaryCta: SiteLinkSchema.optional(),
    secondaryCta: SiteLinkSchema.optional()
  }).strict()
}).strict();

// src/sections/how-to-start.ts
import { z as z13 } from "zod";
var HowToStartSectionSchema = SectionBaseSchema.extend({
  type: z13.literal("how_to_start"),
  props: SectionHeadingSchema.extend({
    steps: z13.array(z13.object({
      title: z13.string().min(1),
      description: z13.string().min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/iframe-embed.ts
import { z as z14 } from "zod";
var IframeEmbedSectionSchema = SectionBaseSchema.extend({
  type: z14.literal("iframe_embed"),
  props: z14.object({
    title: z14.string().min(1),
    description: z14.string().optional(),
    src: HttpsUrlSchema,
    height: z14.number().int().min(240).max(1200).default(640),
    policy: z14.enum(["video", "form", "scheduler", "map"])
  }).strict().superRefine((embed, issue) => {
    if (!isIframeUrlAllowed(embed.src, embed.policy)) {
      issue.addIssue({
        code: "custom",
        message: `Host is not allowed for ${embed.policy} embeds`,
        path: ["src"]
      });
    }
  })
}).strict();

// src/sections/not-sure.ts
import { z as z15 } from "zod";
var NotSureSectionSchema = SectionBaseSchema.extend({
  type: z15.literal("not_sure"),
  props: SectionHeadingSchema.extend({
    cta: SiteLinkSchema
  }).strict()
}).strict();

// src/sections/plans.ts
import { z as z16 } from "zod";
var PlansSectionSchema = SectionBaseSchema.extend({
  type: z16.literal("plans"),
  props: z16.object({
    title: z16.string().min(1).default("Membership plans"),
    locationIds: z16.array(z16.string().min(1)).min(1),
    showLocationName: z16.boolean().default(true),
    display: z16.enum(["grouped", "tabs"]).default("grouped")
  }).strict()
}).strict();
var PlansSectionPropsSchema = PlansSectionSchema.shape.props;

// src/sections/schedules.ts
import { z as z17 } from "zod";
var SchedulesSectionSchema = SectionBaseSchema.extend({
  type: z17.literal("schedules"),
  props: z17.object({
    title: z17.string().min(1).default("Class schedule"),
    locationIds: z17.array(z17.string().min(1)).min(1),
    showLocationName: z17.boolean().default(true),
    display: z17.enum(["tabs", "combined"]).default("tabs")
  }).strict()
}).strict();
var SchedulesSectionPropsSchema = SchedulesSectionSchema.shape.props;

// src/sections/pricing-form.ts
import { z as z18 } from "zod";
var PricingFormSectionSchema = SectionBaseSchema.extend({
  type: z18.literal("pricing_form_section"),
  props: SectionHeadingSchema.extend({
    eyebrow: z18.string().optional(),
    source: FormPlacementSchema
  }).strict()
}).strict();

// src/sections/program-detail.ts
import { z as z19 } from "zod";
var ProgramDetailSectionSchema = SectionBaseSchema.extend({
  type: z19.literal("program_detail"),
  props: z19.object({
    programId: z19.string().min(1)
  }).strict()
}).strict();

// src/sections/programs.ts
import { z as z20 } from "zod";
var ProgramsSectionSchema = SectionBaseSchema.extend({
  type: z20.literal("programs"),
  props: z20.object({
    eyebrow: z20.string().optional(),
    title: z20.string().min(1),
    source: z20.literal("all-visible").optional(),
    programIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/rich-text.ts
import { z as z21 } from "zod";
var RichTextSectionSchema = SectionBaseSchema.extend({
  type: z21.literal("rich_text"),
  props: z21.object({
    eyebrow: z21.string().optional(),
    title: z21.string().min(1),
    body: z21.array(z21.string().min(1)).min(1)
  }).strict()
}).strict();

// src/sections/sandboxed-embed.ts
import { z as z22 } from "zod";
var SandboxedEmbedSectionSchema = SectionBaseSchema.extend({
  type: z22.literal("sandboxed_embed"),
  props: z22.object({
    title: z22.string().trim().min(1).max(200),
    description: z22.string().trim().min(1).max(1000).optional(),
    embedId: z22.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    height: z22.number().int().min(240).max(1200).default(640)
  }).strict()
}).strict();

// src/sections/team.ts
import { z as z23 } from "zod";
var TeamSectionSchema = SectionBaseSchema.extend({
  type: z23.literal("team"),
  props: z23.object({
    title: z23.string().min(1),
    source: z23.literal("all-visible").optional(),
    teamIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/testimonials.ts
import { z as z24 } from "zod";
var TestimonialsSectionSchema = SectionBaseSchema.extend({
  type: z24.literal("testimonials"),
  props: SectionHeadingSchema.extend({
    source: z24.literal("all-visible").optional(),
    testimonialIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/text-iframe.ts
import { z as z25 } from "zod";
var TextIframeSectionSchema = SectionBaseSchema.extend({
  type: z25.literal("text_iframe"),
  props: SectionHeadingSchema.extend({
    src: HttpsUrlSchema,
    height: z25.number().int().min(240).max(1200).default(640),
    policy: z25.enum(["video", "form", "scheduler", "map"])
  }).strict().superRefine((embed, issue) => {
    if (!isIframeUrlAllowed(embed.src, embed.policy)) {
      issue.addIssue({
        code: "custom",
        message: `Host is not allowed for ${embed.policy} embeds`,
        path: ["src"]
      });
    }
  })
}).strict();

// src/sections/three-box.ts
import { z as z26 } from "zod";
var ThreeBoxSectionSchema = SectionBaseSchema.extend({
  type: z26.literal("three_box"),
  props: z26.object({
    title: z26.string().min(1),
    boxes: z26.array(z26.object({
      title: z26.string().min(1),
      description: z26.string().min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/top-review.ts
import { z as z27 } from "zod";
var TopReviewSectionSchema = SectionBaseSchema.extend({
  type: z27.literal("top_review"),
  props: z27.object({
    reviewCount: z27.number().int().nonnegative(),
    averageRating: z27.number().min(0).max(5),
    totalCustomers: z27.number().int().nonnegative(),
    reviews: z27.array(z27.object({
      name: z27.string().min(1),
      title: z27.string().min(1),
      review: z27.string().min(1),
      image: SiteImageSchema.optional()
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/index.ts
var SiteSectionSchema = z28.discriminatedUnion("type", [
  HeroSectionSchema,
  RichTextSectionSchema,
  FormSectionSchema,
  IframeEmbedSectionSchema,
  ExternalWidgetSectionSchema,
  SandboxedEmbedSectionSchema,
  TopReviewSectionSchema,
  AboutSectionSchema,
  ProgramsSectionSchema,
  GallerySectionSchema,
  SchedulesSectionSchema,
  PlansSectionSchema,
  TeamSectionSchema,
  HowToStartSectionSchema,
  TestimonialsSectionSchema,
  FaqsSectionSchema,
  BottomCtaSectionSchema,
  BottomCtaFormSectionSchema,
  ContactFormSectionSchema,
  PricingFormSectionSchema,
  TextIframeSectionSchema,
  ProgramDetailSectionSchema,
  NotSureSectionSchema,
  ThreeBoxSectionSchema,
  CompareSectionSchema
]);

// src/collections.ts
var SlugSchema = z29.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
var OrderedContentSchema = z29.object({
  id: z29.string().min(1),
  visible: z29.boolean().default(true),
  order: z29.number().int().optional()
});
var SiteProgramSchema = OrderedContentSchema.extend({
  slug: SlugSchema,
  name: z29.string().min(1),
  description: z29.string().min(1),
  image: SiteImageSchema.optional(),
  showLearnMore: z29.boolean().default(true),
  detail: z29.object({
    title: z29.string().min(1),
    ageRange: z29.string().min(1),
    ageMinimum: z29.number().int().nonnegative().optional(),
    ageMaximum: z29.number().int().nonnegative().optional(),
    previousRequirement: z29.string().min(1),
    description: z29.string().min(1),
    image: SiteImageSchema.optional(),
    challengeHeading: z29.string().min(1),
    challenges: z29.array(z29.string().min(1)).min(1)
  }).strict().refine((detail) => detail.ageMinimum === undefined || detail.ageMaximum === undefined || detail.ageMinimum <= detail.ageMaximum, "Program minimum age cannot exceed maximum age").optional()
}).strict().superRefine((program, issue) => {
  if (program.showLearnMore && !program.detail) {
    issue.addIssue({
      code: "custom",
      message: "Program detail is required when Learn More is enabled",
      path: ["detail"]
    });
  }
});
var SiteTeamMemberSchema = OrderedContentSchema.extend({
  name: z29.string().min(1),
  description: z29.string().min(1),
  role: z29.string().min(1).optional(),
  isFounder: z29.boolean().optional(),
  image: SiteImageSchema.optional()
}).strict();
var SiteTestimonialSchema = OrderedContentSchema.extend({
  name: z29.string().min(1),
  location: z29.string().min(1),
  text: z29.string().min(1),
  avatar: SiteImageSchema.optional()
}).strict();
var SiteFaqSchema = OrderedContentSchema.extend({
  question: z29.string().min(1),
  answer: z29.string().min(1)
}).strict();
var SiteContentSchema = z29.object({
  programs: z29.array(SiteProgramSchema).default([]),
  teams: z29.array(SiteTeamMemberSchema).default([]),
  testimonials: z29.array(SiteTestimonialSchema).default([]),
  faqs: z29.array(SiteFaqSchema).default([])
}).strict();

// src/context.ts
import { z as z31 } from "zod";

// src/locations.ts
import { z as z30 } from "zod";
var SiteLocationSlugSchema = z30.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Location must be a stable slug");
var SitePostalAddressSchema = z30.object({
  streetAddress: z30.string().min(1).optional(),
  addressLocality: z30.string().min(1).optional(),
  addressRegion: z30.string().min(1).optional(),
  postalCode: z30.string().min(1).optional(),
  addressCountry: z30.string().min(2)
}).strict();
var SiteOpeningHoursSchema = z30.object({
  dayOfWeek: z30.array(z30.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ])).min(1),
  opens: z30.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  closes: z30.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
}).strict();
var SiteLocationSchema = z30.object({
  id: z30.string().min(1).max(128),
  name: z30.string().min(1),
  slug: SiteLocationSlugSchema,
  googlePlaceId: z30.string().trim().min(1).max(256).optional(),
  address: z30.string().min(1).optional(),
  postalAddress: SitePostalAddressSchema.optional(),
  phone: z30.string().min(1).optional(),
  email: z30.string().min(1).optional(),
  timezone: z30.string().min(1),
  paymentGateway: z30.enum(["square", "stripe", "authorize"]).nullable().optional(),
  currency: z30.string().length(3).optional(),
  coordinates: z30.object({
    latitude: z30.number().min(-90).max(90),
    longitude: z30.number().min(-180).max(180)
  }).strict().optional(),
  openingHours: z30.array(SiteOpeningHoursSchema).optional(),
  rating: z30.number().min(0).max(5).optional(),
  reviewCount: z30.number().int().nonnegative().optional()
}).strict();

// src/context.ts
var SiteCapabilitiesSchema = z31.object({
  blog: z31.boolean(),
  commerce: z31.boolean(),
  schedules: z31.boolean(),
  downloads: z31.boolean(),
  memberAuth: z31.boolean()
}).strict();
var TenantContextSchema = z31.object({
  siteId: z31.string().min(1).max(128),
  vendorId: z31.string().min(1).max(128),
  primaryLocationId: z31.string().min(1).max(128),
  allowedLocationIds: z31.array(z31.string().min(1).max(128)).min(1),
  locations: z31.array(SiteLocationSchema).min(1),
  domain: z31.string().min(1).max(253),
  domainSource: z31.enum(["custom", "wildcard"]),
  canonicalDomain: z31.string().min(1).max(253).nullable(),
  isCanonicalDomain: z31.boolean(),
  publishedRevisionId: z31.string().min(1).max(128),
  capabilities: SiteCapabilitiesSchema
}).strict().superRefine((context, issue) => {
  if (context.isCanonicalDomain !== (context.canonicalDomain === context.domain)) {
    issue.addIssue({
      code: "custom",
      message: "Canonical domain state must match the request domain",
      path: ["isCanonicalDomain"]
    });
  }
  if (context.isCanonicalDomain && context.domainSource !== "custom") {
    issue.addIssue({
      code: "custom",
      message: "Managed domains cannot be canonical",
      path: ["domainSource"]
    });
  }
}).superRefine((context, issue) => {
  const allowedIds = new Set(context.allowedLocationIds);
  const locationIds = new Set(context.locations.map((location) => location.id));
  if (allowedIds.size !== context.allowedLocationIds.length) {
    issue.addIssue({
      code: "custom",
      message: "Allowed location IDs must be unique",
      path: ["allowedLocationIds"]
    });
  }
  if (!allowedIds.has(context.primaryLocationId)) {
    issue.addIssue({
      code: "custom",
      message: "Primary location must be allowed",
      path: ["primaryLocationId"]
    });
  }
  if (locationIds.size !== context.locations.length || locationIds.size !== allowedIds.size || [...locationIds].some((id) => !allowedIds.has(id))) {
    issue.addIssue({
      code: "custom",
      message: "Location metadata must match the allowed location IDs",
      path: ["locations"]
    });
  }
});

// src/scripts-and-embeds.ts
import { z as z32 } from "zod";
var MAX_SITE_CUSTOM_EMBED_BYTES = 75000;
var MAX_SITE_SANDBOXED_EMBED_BYTES = 75000;
var SiteScriptPurposeSchema = z32.enum([
  "functional",
  "analytics",
  "marketing"
]);
var SiteScriptPlacementSchema = z32.enum([
  "head",
  "body_start",
  "body_end"
]);
var SiteScriptEntryBaseSchema = z32.object({
  id: z32.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z32.string().trim().min(1).max(120),
  enabled: z32.boolean(),
  purpose: SiteScriptPurposeSchema
});
var SiteGtmEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("gtm"),
  containerId: z32.string().trim().regex(/^GTM-[A-Z0-9]+$/i)
}).strict();
var SiteGoogleTagEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("google_tag"),
  tagId: z32.string().trim().regex(/^(?:GT|G|AW|DC)-[A-Z0-9]+$/i)
}).strict();
var SiteMetaPixelEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("meta_pixel"),
  pixelId: z32.string().trim().regex(/^\d{5,32}$/)
}).strict();
var SiteTikTokPixelEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("tiktok_pixel"),
  pixelId: z32.string().trim().regex(/^[A-Z0-9]{10,32}$/i)
}).strict();
var ReferrerPolicySchema = z32.enum([
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url"
]);
var SiteCustomScriptAttributesSchema = z32.object({
  async: z32.boolean().optional(),
  defer: z32.boolean().optional(),
  crossOrigin: z32.enum(["anonymous", "use-credentials"]).optional(),
  integrity: z32.string().trim().min(1).max(1024).optional(),
  module: z32.boolean().optional(),
  referrerPolicy: ReferrerPolicySchema.optional(),
  data: z32.record(z32.string().regex(/^[a-z0-9_.:-]+$/i), z32.string().max(4096)).optional()
}).strict();
function isAllowedScriptUrl(value) {
  if (/^\/(?!\/)/.test(value))
    return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
var SiteCustomExternalScriptPartSchema = z32.object({
  type: z32.literal("external_script"),
  src: z32.string().trim().max(4096).refine(isAllowedScriptUrl, "External scripts require a same-origin path or credential-free HTTPS URL"),
  attributes: SiteCustomScriptAttributesSchema.default({})
}).strict();
var SiteCustomInlineScriptPartSchema = z32.object({
  type: z32.literal("inline_script"),
  code: z32.string().min(1).max(50000).refine((value) => !/\bdocument\s*\.\s*write(?:ln)?\s*\(/i.test(value), "document.write is not supported"),
  module: z32.boolean().optional()
}).strict();
var SiteCustomMarkupPartSchema = z32.object({
  type: z32.literal("markup"),
  html: z32.string().min(1).max(75000).refine((value) => !/<\/?script\b/i.test(value), "Markup parts cannot contain script tags")
}).strict();
var SiteCustomEmbedPartSchema = z32.discriminatedUnion("type", [
  SiteCustomExternalScriptPartSchema,
  SiteCustomInlineScriptPartSchema,
  SiteCustomMarkupPartSchema
]);
function siteCustomEmbedPartsByteLength(parts) {
  let bytes = 0;
  for (const character of JSON.stringify(parts)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 127)
      bytes += 1;
    else if (codePoint <= 2047)
      bytes += 2;
    else if (codePoint <= 65535)
      bytes += 3;
    else
      bytes += 4;
  }
  return bytes;
}
var SiteCustomEmbedEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("custom"),
  placement: SiteScriptPlacementSchema,
  parts: z32.array(SiteCustomEmbedPartSchema).min(1).max(40)
}).strict().superRefine((entry, issue) => {
  if (siteCustomEmbedPartsByteLength(entry.parts) > MAX_SITE_CUSTOM_EMBED_BYTES) {
    issue.addIssue({
      code: "custom",
      message: "Custom embed content cannot exceed 75 KB",
      path: ["parts"]
    });
  }
  if (entry.placement === "head" && entry.parts.some((part) => part.type === "markup")) {
    issue.addIssue({
      code: "custom",
      message: "Visible markup cannot be placed in the document head",
      path: ["parts"]
    });
  }
});
function utf8ByteLength(value) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 127)
      bytes += 1;
    else if (codePoint <= 2047)
      bytes += 2;
    else if (codePoint <= 65535)
      bytes += 3;
    else
      bytes += 4;
  }
  return bytes;
}
var SiteSandboxedEmbedEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z32.literal("sandboxed_embed"),
  source: z32.string().max(MAX_SITE_SANDBOXED_EMBED_BYTES).refine((value) => value.trim().length > 0, "Sandboxed embed source is required")
}).strict().superRefine((entry, issue) => {
  if (utf8ByteLength(entry.source) > MAX_SITE_SANDBOXED_EMBED_BYTES) {
    issue.addIssue({
      code: "custom",
      message: "Sandboxed embed content cannot exceed 75 KB",
      path: ["source"]
    });
  }
});
var SiteScriptEntrySchema = z32.discriminatedUnion("kind", [
  SiteGtmEntrySchema,
  SiteGoogleTagEntrySchema,
  SiteMetaPixelEntrySchema,
  SiteTikTokPixelEntrySchema,
  SiteCustomEmbedEntrySchema,
  SiteSandboxedEmbedEntrySchema
]);
function providerIdentity(entry) {
  switch (entry.kind) {
    case "gtm":
      return `${entry.kind}:${entry.containerId.toUpperCase()}`;
    case "google_tag":
      return `${entry.kind}:${entry.tagId.toUpperCase()}`;
    case "meta_pixel":
    case "tiktok_pixel":
      return `${entry.kind}:${entry.pixelId.toUpperCase()}`;
    case "custom":
    case "sandboxed_embed":
      return null;
  }
}
var SiteScriptsAndEmbedsSchema = z32.object({
  enabled: z32.boolean().default(true),
  entries: z32.array(SiteScriptEntrySchema).max(20).default([])
}).strict().superRefine((config, issue) => {
  const entryIds = new Set;
  const providerIds = new Set;
  for (const [index, entry] of config.entries.entries()) {
    if (entryIds.has(entry.id)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate script or embed ID: ${entry.id}`,
        path: ["entries", index, "id"]
      });
    }
    entryIds.add(entry.id);
    const identity = providerIdentity(entry);
    if (!identity)
      continue;
    if (providerIds.has(identity)) {
      issue.addIssue({
        code: "custom",
        message: "This provider ID is already configured",
        path: ["entries", index]
      });
    }
    providerIds.add(identity);
  }
});

// src/config.ts
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
var structuredDataTypes = new Set([
  "LocalBusiness",
  "SportsActivityLocation",
  "EducationalOrganization",
  "Organization"
]);
function normalizePageMetadata(value) {
  const metadata = asRecord(value) ?? {};
  const { image, ...rest } = metadata;
  const openGraphImage = metadata.openGraphImage ?? image;
  return {
    ...rest,
    ...openGraphImage === undefined ? {} : { openGraphImage },
    indexable: typeof metadata.indexable === "boolean" ? metadata.indexable : true
  };
}
function normalizeSitePageTemplateV2(input) {
  const source = asRecord(input);
  if (!source || source.schemaVersion !== 1)
    return input;
  const page = asRecord(source.page);
  if (!page)
    return input;
  return {
    ...source,
    schemaVersion: 2,
    page: { ...page, metadata: normalizePageMetadata(page.metadata) }
  };
}
function normalizeSiteConfigV2(input) {
  const source = asRecord(input);
  if (!source || source.schemaVersion !== 1 && source.schemaVersion !== 2) {
    return input;
  }
  const legacy = source.schemaVersion === 1;
  const business = asRecord(source.business) ?? {};
  const metadata = asRecord(source.metadata) ?? {};
  const pages = legacy && Array.isArray(source.pages) ? source.pages.map((value) => {
    const page = asRecord(value);
    return page ? { ...page, metadata: normalizePageMetadata(page.metadata) } : value;
  }) : source.pages;
  const home = Array.isArray(pages) ? pages.map(asRecord).find((page) => page?.id === "home") : undefined;
  const hero2 = Array.isArray(home?.sections) ? home.sections.map(asRecord).find((section) => section?.type === "hero" && section.visible !== false) : undefined;
  const heroImage = asRecord(hero2?.props)?.image;
  const openGraphImage = metadata.openGraphImage ?? (legacy ? metadata.image : undefined) ?? heroImage;
  const defaultTitle = typeof metadata.defaultTitle === "string" ? metadata.defaultTitle : typeof business.name === "string" ? business.name : "Monstro Site";
  const structuredDataType = !legacy || typeof business.structuredDataType === "string" && structuredDataTypes.has(business.structuredDataType) ? business.structuredDataType : "LocalBusiness";
  const metadataRest = legacy ? Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "image")) : metadata;
  return {
    ...source,
    schemaVersion: 2,
    business: { ...business, structuredDataType },
    metadata: {
      ...metadataRest,
      defaultTitle,
      ...openGraphImage === undefined ? {} : { openGraphImage }
    },
    pages
  };
}
var NavigationItemSchema = z33.lazy(() => z33.discriminatedUnion("type", [
  z33.object({
    type: z33.literal("link"),
    id: z33.string().min(1),
    label: z33.string().min(1),
    href: SiteHrefSchema,
    external: z33.boolean(),
    visible: z33.boolean()
  }).strict(),
  z33.object({
    type: z33.literal("group"),
    id: z33.string().min(1),
    label: z33.string().min(1),
    visible: z33.boolean(),
    items: z33.array(NavigationItemSchema).min(1)
  }).strict()
]));
var SiteHeaderActionSchema = z33.discriminatedUnion("kind", [
  z33.object({
    kind: z33.literal("link"),
    label: z33.string().min(1).max(100),
    href: SiteHrefSchema,
    external: z33.boolean()
  }).strict(),
  z33.object({ kind: z33.literal("hidden") }).strict()
]);
var HexColorSchema = z33.string().regex(/^#[0-9a-f]{6}$/i);
var PagePathSchema = z33.string().regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
var SiteThemeSchema = z33.object({
  colors: z33.object({
    primary: HexColorSchema,
    background: HexColorSchema,
    foreground: HexColorSchema,
    muted: HexColorSchema,
    accent: HexColorSchema
  }).strict(),
  typography: z33.object({
    heading: z33.enum(["sans", "serif"]),
    body: z33.enum(["sans", "serif"])
  }).strict(),
  radius: z33.enum(["none", "small", "medium", "large"])
}).strict();
var SitePageHeaderSchema = z33.object({
  mode: z33.enum(["auto", "overlay", "stacked", "sticky"]).default("auto"),
  contrast: z33.enum(["auto", "light", "dark"]).default("auto")
}).strict();
var SitePageBaseSchema = z33.object({
  id: z33.string().min(1),
  path: PagePathSchema,
  visible: z33.boolean(),
  metadata: z33.object({
    title: z33.string().min(1),
    description: z33.string().optional(),
    openGraphImage: SiteImageSchema.optional(),
    indexable: z33.boolean().optional()
  }).strict(),
  header: SitePageHeaderSchema.optional()
});
var SiteSectionsPageSchema = SitePageBaseSchema.extend({
  kind: z33.literal("sections").default("sections"),
  sections: z33.array(SiteSectionSchema).min(1)
}).strict();
var SitePageTemplateSchema = z33.object({
  schemaVersion: z33.literal(2),
  page: z33.object({
    metadata: z33.object({
      description: z33.string().optional(),
      openGraphImage: SiteImageSchema.optional(),
      indexable: z33.boolean().optional()
    }).strict(),
    sections: z33.array(SiteSectionSchema).min(1)
  }).strict()
}).strict();
function replacePageTemplateTokens(value, businessName) {
  if (typeof value === "string")
    return value.replaceAll("{{businessName}}", businessName);
  if (Array.isArray(value))
    return value.map((item) => replacePageTemplateTokens(item, businessName));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      replacePageTemplateTokens(item, businessName)
    ]));
  }
  return value;
}
function materializeSitePageTemplate(input, businessName) {
  return SitePageTemplateSchema.parse(normalizeSitePageTemplateV2(replacePageTemplateTokens(input, businessName)));
}
var BuiltinPageIdSchema = z33.enum(["schedules", "blog", "download", "shop", "shop-plans"]);
var BUILTIN_PAGE_PATHS = {
  "/schedules": "schedules",
  "/blog": "blog",
  "/download": "download",
  "/shop": "shop",
  "/shop/plans": "shop-plans"
};
var SiteBuiltinPageSchema = SitePageBaseSchema.extend({
  kind: z33.literal("builtin"),
  id: BuiltinPageIdSchema,
  path: z33.enum(["/schedules", "/blog", "/download", "/shop", "/shop/plans"])
}).strict().refine((page) => BUILTIN_PAGE_PATHS[page.path] === page.id, "Builtin page ID and path must match");
var SitePageSchema = z33.union([
  SiteSectionsPageSchema,
  SiteBuiltinPageSchema
]);
var SiteIntegrationsSchema = z33.object({
  ghl: z33.object({
    privateIntegrationToken: z33.string().trim().min(1).max(4096),
    locationId: z33.string().trim().min(1).max(255)
  }).strict()
}).strict();
var SiteConfigSchema = z33.object({
  schemaVersion: z33.literal(2),
  locale: z33.string().min(2),
  business: z33.object({
    name: z33.string().min(1),
    tagline: z33.string().min(1),
    logo: SiteImageSchema.optional(),
    structuredDataType: z33.enum([
      "LocalBusiness",
      "SportsActivityLocation",
      "EducationalOrganization",
      "Organization"
    ])
  }).strict(),
  metadata: z33.object({
    defaultTitle: z33.string().min(1),
    titleTemplate: z33.string().min(1),
    defaultDescription: z33.string().min(1),
    openGraphImage: SiteImageSchema.optional(),
    googleSiteVerification: z33.string().min(1).optional()
  }).strict(),
  theme: SiteThemeSchema,
  headerAction: SiteHeaderActionSchema.optional(),
  navigation: z33.array(NavigationItemSchema),
  footer: z33.object({
    credit: z33.string(),
    links: z33.array(NavigationItemSchema)
  }).strict(),
  content: SiteContentSchema.default({
    programs: [],
    teams: [],
    testimonials: [],
    faqs: []
  }),
  pages: z33.array(SitePageSchema).min(1),
  forms: z33.array(SiteFormSchema),
  capabilities: SiteCapabilitiesSchema,
  integrations: SiteIntegrationsSchema.optional(),
  scriptsAndEmbeds: SiteScriptsAndEmbedsSchema.default({
    enabled: true,
    entries: []
  })
}).strict().superRefine((config, issue) => {
  const pageIds = new Set;
  const pagePaths = new Set;
  const formIds = new Set;
  const sandboxedEmbedIds = new Set(config.scriptsAndEmbeds.entries.flatMap((entry) => entry.kind === "sandboxed_embed" ? [entry.id] : []));
  const contentIds = {
    programs: new Set,
    teams: new Set,
    testimonials: new Set,
    faqs: new Set
  };
  for (const collection of Object.keys(contentIds)) {
    for (const [index, item] of config.content[collection].entries()) {
      if (contentIds[collection].has(item.id)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate ${collection} ID: ${item.id}`,
          path: ["content", collection, index, "id"]
        });
      }
      contentIds[collection].add(item.id);
    }
  }
  const programSlugs = new Set;
  for (const [index, program] of config.content.programs.entries()) {
    if (programSlugs.has(program.slug)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate program slug: ${program.slug}`,
        path: ["content", "programs", index, "slug"]
      });
    }
    programSlugs.add(program.slug);
  }
  for (const [index, form2] of config.forms.entries()) {
    if (formIds.has(form2.id)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate form ID: ${form2.id}`,
        path: ["forms", index, "id"]
      });
    }
    formIds.add(form2.id);
  }
  function checkNavigation(items, path) {
    const ids = new Set;
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate navigation ID: ${item.id}`,
          path: [...path, index, "id"]
        });
      }
      ids.add(item.id);
      if (item.type === "group") {
        checkNavigation(item.items, [...path, index, "items"]);
      }
    }
  }
  checkNavigation(config.navigation, ["navigation"]);
  checkNavigation(config.footer.links, ["footer", "links"]);
  if (!config.pages.some((page) => page.visible && page.path === "/")) {
    issue.addIssue({
      code: "custom",
      message: "A visible home page is required",
      path: ["pages"]
    });
  }
  function checkContentReferences(ids, knownIds, label) {
    for (const id of ids ?? []) {
      if (!knownIds.has(id)) {
        issue.addIssue({
          code: "custom",
          message: `Unknown ${label} ID: ${id}`,
          path: ["pages"]
        });
      }
    }
  }
  for (const page of config.pages) {
    if (pageIds.has(page.id)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate page ID: ${page.id}`,
        path: ["pages"]
      });
    }
    if (pagePaths.has(page.path)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate page path: ${page.path}`,
        path: ["pages"]
      });
    }
    pageIds.add(page.id);
    pagePaths.add(page.path);
    if (page.kind === "sections" && page.path !== "/download" && page.path in BUILTIN_PAGE_PATHS) {
      issue.addIssue({
        code: "custom",
        message: `Builtin page path cannot contain editable sections: ${page.path}`,
        path: ["pages"]
      });
    }
    if (page.kind === "builtin")
      continue;
    const sectionIds = new Set;
    const renderedSectionIds = new Set;
    for (const section of page.sections) {
      if (sectionIds.has(section.id)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate section ID on ${page.path}: ${section.id}`,
          path: ["pages"]
        });
      }
      sectionIds.add(section.id);
      const renderedId = section.anchor ?? section.id;
      if (renderedSectionIds.has(renderedId)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate rendered section ID on ${page.path}: ${renderedId}`,
          path: ["pages"]
        });
      }
      renderedSectionIds.add(renderedId);
      const formId = section.type === "form" || section.type === "contact_form_section" || section.type === "pricing_form_section" || section.type === "bottom_cta_form" ? section.props.source.kind === "native" ? section.props.source.formId : undefined : undefined;
      if (formId && !formIds.has(formId)) {
        issue.addIssue({
          code: "custom",
          message: `Unknown form ID: ${formId}`,
          path: ["pages"]
        });
      }
      if (section.type === "sandboxed_embed" && !sandboxedEmbedIds.has(section.props.embedId)) {
        issue.addIssue({
          code: "custom",
          message: `Unknown sandboxed embed ID: ${section.props.embedId}`,
          path: ["pages"]
        });
      }
      if (section.type === "programs") {
        checkContentReferences(section.props.programIds, contentIds.programs, "program");
      } else if (section.type === "team") {
        checkContentReferences(section.props.teamIds, contentIds.teams, "team member");
      } else if (section.type === "testimonials") {
        checkContentReferences(section.props.testimonialIds, contentIds.testimonials, "testimonial");
      } else if (section.type === "faqs") {
        checkContentReferences(section.props.faqIds, contentIds.faqs, "FAQ");
      } else if (section.type === "program_detail") {
        checkContentReferences([section.props.programId], contentIds.programs, "program");
      }
    }
  }
  const visiblePageIds = new Set(config.pages.filter((page) => page.visible).map((page) => page.id));
  function checkRedirect(target, type, path) {
    if (!target)
      return;
    if (type === "url") {
      const sample = target.replace(/\{[A-Za-z][A-Za-z0-9_]*\}/g, "value");
      if (!SiteHrefSchema.safeParse(sample).success) {
        issue.addIssue({ code: "custom", message: "Redirect URL must be site-relative or HTTPS", path });
      }
    } else if (!visiblePageIds.has(target)) {
      issue.addIssue({ code: "custom", message: `Redirect references an unknown or hidden page: ${target}`, path });
    }
  }
  for (const [formIndex, form2] of config.forms.entries()) {
    if (Array.isArray(form2.redirectRules)) {
      for (const [ruleIndex, rule] of form2.redirectRules.entries()) {
        checkRedirect(rule.redirectTo, rule.redirectToType, ["forms", formIndex, "redirectRules", ruleIndex, "redirectTo"]);
      }
    } else {
      checkRedirect(form2.redirectTo ?? (typeof form2.redirectRules === "string" ? form2.redirectRules : undefined), form2.redirectToType, ["forms", formIndex, "redirectTo"]);
    }
    for (const [fieldIndex, field] of form2.fields.entries()) {
      for (const [optionIndex, option] of (field.options ?? []).entries()) {
        checkRedirect(option.redirectTo, "page", ["forms", formIndex, "fields", fieldIndex, "options", optionIndex, "redirectTo"]);
      }
    }
  }
  for (const [index, program] of config.content.programs.entries()) {
    const programPath = `/programs/${program.slug}`;
    if (program.visible && program.showLearnMore && !config.pages.some((page) => page.visible && page.path === programPath)) {
      issue.addIssue({
        code: "custom",
        message: `Visible program requires page: ${programPath}`,
        path: ["content", "programs", index, "slug"]
      });
    }
  }
});
function relativeLuminance(hex) {
  const channel = (offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrastForBackground(background) {
  const luminance = relativeLuminance(background);
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;
  return lightContrast >= darkContrast ? "light" : "dark";
}
function resolveSitePageHeader(page, theme) {
  const firstSection = page?.kind === "sections" ? page.sections.find((section) => section.visible) : undefined;
  const startsWithImageHero = firstSection?.type === "hero" && Boolean(firstSection.props.image);
  const requestedMode = page?.header?.mode ?? "auto";
  const mode = requestedMode === "auto" ? startsWithImageHero ? "overlay" : "stacked" : requestedMode;
  const requestedContrast = page?.header?.contrast ?? "auto";
  const contrast = requestedContrast === "auto" ? mode === "overlay" && startsWithImageHero ? "light" : contrastForBackground(theme.colors.background) : requestedContrast;
  const placement = requestedMode === "auto" ? "legacy" : mode === "overlay" ? "overlay" : mode === "stacked" ? "flow" : "sticky";
  return {
    mode,
    contrast,
    placement,
    reserveSpace: placement === "legacy" && mode === "stacked" && firstSection?.type !== "not_sure"
  };
}
function parseSiteConfig(input) {
  return SiteConfigSchema.parse(input);
}
export {
  resolveSitePageHeader,
  parseSiteConfig,
  normalizeSitePageTemplateV2,
  normalizeSiteConfigV2,
  materializeSitePageTemplate,
  SiteThemeSchema,
  SiteSectionsPageSchema,
  SitePageTemplateSchema,
  SitePageSchema,
  SitePageHeaderSchema,
  SiteHeaderActionSchema,
  SiteConfigSchema,
  SiteBuiltinPageSchema,
  NavigationItemSchema,
  BuiltinPageIdSchema
};
