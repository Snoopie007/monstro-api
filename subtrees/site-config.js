// @bun
// src/config.ts
import { z as z35 } from "zod";

// src/collections.ts
import { z as z31 } from "zod";

// src/sections/index.ts
import { z as z30 } from "zod";

// src/sections/about.ts
import { z as z3 } from "zod";

// src/sections/primitives.ts
import { z as z2 } from "zod";

// src/image-target.ts
import { z } from "zod";
var id = z.string().min(1);
var SectionImageTargetOptions = [
  z.object({
    kind: z.literal("section"),
    sectionId: id,
    slot: z.literal("image")
  }).strict(),
  z.object({
    kind: z.literal("section-item"),
    sectionId: id,
    slot: z.enum(["images", "reviews.image"]),
    itemId: id
  }).strict(),
  z.object({
    kind: z.literal("content"),
    collection: z.literal("programs"),
    itemId: id,
    slot: z.enum(["image", "detail.image"])
  }).strict(),
  z.object({
    kind: z.literal("content"),
    collection: z.literal("teams"),
    itemId: id,
    slot: z.literal("image")
  }).strict(),
  z.object({
    kind: z.literal("content"),
    collection: z.literal("testimonials"),
    itemId: id,
    slot: z.literal("avatar")
  }).strict()
];
var SectionImageTargetSchema = z.union(SectionImageTargetOptions);
var SiteImageTargetSchema = z.union([
  ...SectionImageTargetOptions,
  z.object({
    kind: z.literal("business"),
    slot: z.literal("logo")
  }).strict(),
  z.object({
    kind: z.literal("page"),
    pageId: id,
    slot: z.literal("metadata.openGraphImage")
  }).strict()
]);
function sectionImageTargetKey(target) {
  switch (target.kind) {
    case "section":
      return `${target.kind}:${target.sectionId}:${target.slot}`;
    case "section-item":
      return `${target.kind}:${target.sectionId}:${target.slot}:${target.itemId}`;
    case "content":
      return `${target.kind}:${target.collection}:${target.itemId}:${target.slot}`;
  }
}

// src/sections/video.ts
var YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;
var VIMEO_ID_PATTERN = /^\d+$/;
var VEED_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
var YOUTUBE_SHORT_HOST_PATTERN = /^(?:.+\.)?youtu\.be$/;
var YOUTUBE_HOST_PATTERN = /^(?:.+\.)?youtube(?:-nocookie)?\.com$/;
var VIMEO_HOST_PATTERN = /^(?:.+\.)?vimeo\.com$/;
var YOUTUBE_PATH_KINDS = new Set(["embed", "shorts", "live"]);
var VEED_QUERY_PARAMS = ["watermark", "color", "sharing", "title"];
function parseSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}
function veedEmbedUrl(url) {
  const [kind, id2, extra] = url.pathname.split("/").filter(Boolean);
  if (kind !== "embed" || !id2 || extra || !VEED_ID_PATTERN.test(id2))
    return null;
  const embed = new URL(`https://www.veed.io/embed/${id2}`);
  for (const key of VEED_QUERY_PARAMS) {
    const value = url.searchParams.get(key);
    if (value !== null)
      embed.searchParams.set(key, value);
  }
  return embed.toString();
}
function toVideoEmbedUrl(value) {
  const url = parseSafeUrl(value);
  if (!url)
    return null;
  const hostname = url.hostname.toLowerCase();
  const [kind, pathId] = url.pathname.split("/").filter(Boolean);
  if (YOUTUBE_SHORT_HOST_PATTERN.test(hostname)) {
    return kind && YOUTUBE_ID_PATTERN.test(kind) ? `https://www.youtube-nocookie.com/embed/${kind}` : null;
  }
  if (YOUTUBE_HOST_PATTERN.test(hostname)) {
    const id2 = kind === "watch" ? url.searchParams.get("v") : YOUTUBE_PATH_KINDS.has(kind ?? "") ? pathId : url.searchParams.get("v");
    return id2 && YOUTUBE_ID_PATTERN.test(id2) ? `https://www.youtube-nocookie.com/embed/${id2}` : null;
  }
  if (VIMEO_HOST_PATTERN.test(hostname)) {
    const id2 = kind === "video" ? pathId : kind;
    return id2 && VIMEO_ID_PATTERN.test(id2) ? `https://player.vimeo.com/video/${id2}` : null;
  }
  if (hostname === "veed.io" || hostname === "www.veed.io") {
    return veedEmbedUrl(url);
  }
  return null;
}

// src/sections/primitives.ts
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
var SiteHrefSchema = z2.string().min(1).refine(isSiteHref, "Link must be site-relative, an anchor, or HTTPS");
var SiteAssetSrcSchema = SiteHrefSchema.refine((value) => !value.startsWith("#"), "Asset URL must be site-relative or HTTPS");
var HttpsUrlSchema = z2.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "URL must use HTTPS without embedded credentials");
var SectionIdentifierSchema = z2.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
var IFRAME_HOSTS = {
  video: ["youtube.com", "youtube-nocookie.com", "vimeo.com", "veed.io"],
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
var SiteImageSchema = z2.object({
  id: SectionIdentifierSchema.optional(),
  src: SiteAssetSrcSchema,
  alt: z2.string(),
  width: z2.number().int().positive().optional(),
  height: z2.number().int().positive().optional()
}).strict().superRefine((image, issue) => {
  if (image.width === undefined !== (image.height === undefined)) {
    issue.addIssue({
      code: "custom",
      message: "Image width and height must be provided together",
      path: ["width"]
    });
  }
});
var SiteLinkSchema = z2.object({
  label: z2.string().min(1),
  href: SiteHrefSchema,
  external: z2.boolean().default(false),
  variant: z2.enum(["primary", "secondary"]).default("primary")
}).strict();
var SectionImageFitSchema = z2.enum(["cover", "contain", "fill"]);
var SectionImagePositionSchema = z2.enum([
  "center",
  "top",
  "bottom",
  "left",
  "right"
]);
var SectionImageOverrideSchema = z2.object({
  target: SectionImageTargetSchema,
  fit: SectionImageFitSchema.optional(),
  position: SectionImagePositionSchema.optional()
}).strict().refine((override) => override.fit !== undefined || override.position !== undefined, "Image override must set fit or position");
var SectionPresentationSchema = z2.object({
  imageFit: SectionImageFitSchema.optional(),
  imagePosition: SectionImagePositionSchema.optional(),
  imageOverrides: z2.array(SectionImageOverrideSchema).min(1).superRefine((overrides, issue) => {
    const targets = new Set;
    for (const [index, override] of overrides.entries()) {
      const key = sectionImageTargetKey(override.target);
      if (targets.has(key)) {
        issue.addIssue({
          code: "custom",
          message: "Duplicate image presentation target",
          path: [index, "target"]
        });
      }
      targets.add(key);
    }
  }).optional()
}).strict().refine((presentation) => presentation.imageFit !== undefined || presentation.imagePosition !== undefined || presentation.imageOverrides !== undefined, "Presentation must configure an image");
var SectionBaseSchema = z2.object({
  id: SectionIdentifierSchema,
  visible: z2.boolean().default(true),
  anchor: SectionIdentifierSchema.optional()
});
var MediaSectionBaseSchema = SectionBaseSchema.extend({
  presentation: SectionPresentationSchema.optional()
});
var OrderedIdsSchema = z2.array(z2.string().min(1)).min(1).optional();
var SectionHeadingSchema = z2.object({
  title: z2.string().min(1),
  description: z2.string().min(1)
});

// src/sections/about.ts
var AboutSectionSchema = MediaSectionBaseSchema.extend({
  type: z3.literal("about"),
  props: z3.object({
    image: SiteImageSchema.optional(),
    headline: z3.string().min(1),
    description: z3.array(z3.string().min(1)).min(1),
    bullets: z3.array(z3.object({
      title: z3.string().min(1),
      body: z3.string().min(1)
    }).strict())
  }).strict()
}).strict();

// src/sections/bottom-cta.ts
import { z as z4 } from "zod";
var BottomCtaSectionSchema = MediaSectionBaseSchema.extend({
  type: z4.literal("bottom_cta"),
  props: SectionHeadingSchema.extend({
    title: z4.string(),
    description: z4.string(),
    variant: z4.enum(["full", "box"]).default("full"),
    image: SiteImageSchema.optional(),
    cta: SiteLinkSchema.optional()
  }).strict()
}).strict();

// src/sections/bottom-cta-form.ts
import { z as z6 } from "zod";

// src/forms.ts
import { z as z5 } from "zod";
var FormIdSchema = z5.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
var FieldNameSchema = z5.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_]*$/);
var RedirectTypeSchema = z5.enum(["page", "url"]);
var FormFieldSchema = z5.object({
  name: FieldNameSchema,
  type: z5.enum(["text", "textarea", "select"]),
  label: z5.string().min(1).max(200),
  required: z5.boolean().default(false),
  placeholder: z5.string().max(300).optional(),
  options: z5.array(z5.object({
    label: z5.string().min(1).max(200),
    value: z5.string().min(1).max(300),
    redirectTo: z5.string().max(2000).optional()
  }).strict()).max(100).optional(),
  rules: z5.object({
    minLength: z5.number().int().nonnegative().optional(),
    maxLength: z5.number().int().positive().optional(),
    format: z5.enum(["email"]).optional()
  }).strict().optional(),
  showWhen: z5.object({
    field: FieldNameSchema,
    equals: z5.string().max(1000)
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
var RedirectRuleSchema = z5.object({
  when: z5.object({
    field: FieldNameSchema,
    equals: z5.string().max(1000)
  }).strict(),
  redirectTo: z5.string().min(1).max(2000),
  redirectToType: RedirectTypeSchema.optional()
}).strict();
var NativeSiteFormSchema = z5.object({
  id: FormIdSchema,
  name: z5.string().min(1).max(200),
  title: z5.string().min(1).max(300).optional(),
  description: z5.string().max(2000).optional(),
  submitLabel: z5.string().min(1).max(100).optional(),
  thankYouMessage: z5.string().max(2000).optional(),
  redirectTo: z5.string().max(2000).optional(),
  redirectToType: RedirectTypeSchema.optional(),
  redirectRules: z5.union([z5.string(), z5.array(RedirectRuleSchema), z5.null()]).default(null),
  tags: z5.array(z5.string().min(1).max(200)).max(100).default([]),
  fields: z5.array(FormFieldSchema).min(1).max(100)
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
var IframeFormPlacementSchema = z5.object({
  kind: z5.literal("iframe"),
  src: HttpsUrlSchema,
  title: z5.string().min(1).max(200),
  height: z5.number().int().min(120).max(1200).default(600)
}).strict().superRefine((placement, issue) => {
  if (!isIframeUrlAllowed(placement.src, "form")) {
    issue.addIssue({ code: "custom", message: "Host is not allowed for form embeds", path: ["src"] });
  }
});
var FormPlacementSchema = z5.discriminatedUnion("kind", [
  z5.object({
    kind: z5.literal("native"),
    formId: FormIdSchema,
    fixedLocationId: z5.string().min(1).max(128).optional()
  }).strict(),
  IframeFormPlacementSchema
]);
var FormValueSchema = z5.union([z5.string().max(1e4), z5.boolean()]);
var FormValuesSchema = z5.record(FieldNameSchema, FormValueSchema);
var FormSubmissionRequestSchema = z5.object({
  formId: FormIdSchema,
  nonce: z5.string().min(1).max(4000),
  values: FormValuesSchema
}).strict();
var FormSubmissionResponseSchema = z5.object({
  ok: z5.literal(true),
  message: z5.string(),
  redirectTo: z5.string().optional()
}).strict();
var SiteFormSchema = NativeSiteFormSchema;
var REQUIRED_CONSENT_FIELDS = ["marketingConsent", "nonMarketingConsent"];
function isFormFieldVisible(field, values) {
  if (!field.showWhen)
    return true;
  return String(values[field.showWhen.field] ?? "") === field.showWhen.equals;
}
function getFormValidationErrors(form, input) {
  const parsed = FormValuesSchema.safeParse(input);
  if (!parsed.success)
    return { _form: "Invalid form values." };
  const errors = {};
  const allowedFields = new Map(form.fields.map((field) => [field.name, field]));
  for (const key of Object.keys(parsed.data)) {
    if (!allowedFields.has(key) && !REQUIRED_CONSENT_FIELDS.includes(key)) {
      errors[key] = "Unknown form field.";
    }
  }
  for (const field of form.fields) {
    if (!isFormFieldVisible(field, parsed.data))
      continue;
    const rawValue = parsed.data[field.name];
    const value = typeof rawValue === "string" ? rawValue : "";
    if (field.required && value.trim().length === 0) {
      errors[field.name] = `${field.label} is required.`;
    } else if (field.type === "select" && value && !field.options?.some((option) => option.value === value)) {
      errors[field.name] = `Select a valid ${field.label.toLowerCase()}.`;
    } else if (field.rules?.minLength !== undefined && value && value.length < field.rules.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.rules.minLength} characters.`;
    } else if (field.rules?.maxLength !== undefined && value.length > field.rules.maxLength) {
      errors[field.name] = `${field.label} must be at most ${field.rules.maxLength} characters.`;
    } else if (field.rules?.format === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.name] = "Enter a valid email address.";
    }
  }
  for (const field of REQUIRED_CONSENT_FIELDS) {
    if (parsed.data[field] !== true)
      errors[field] = "Consent is required to submit this form.";
  }
  return errors;
}
function validateFormValues(form, input) {
  const parsed = FormValuesSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("Invalid form values.");
  const errors = getFormValidationErrors(form, parsed.data);
  if (Object.keys(errors).length > 0)
    throw new Error(Object.values(errors).join(" "));
  const values = {};
  for (const field of form.fields) {
    if (isFormFieldVisible(field, parsed.data) && parsed.data[field.name] !== undefined) {
      values[field.name] = parsed.data[field.name];
    }
  }
  for (const field of REQUIRED_CONSENT_FIELDS)
    values[field] = true;
  return values;
}
function resolveFormRedirect(form, values, pages) {
  for (const field of form.fields) {
    if (!isFormFieldVisible(field, values) || field.type !== "select")
      continue;
    const selected = field.options?.find((option) => option.value === String(values[field.name] ?? ""));
    const redirect = resolveRedirectTarget(selected?.redirectTo, undefined, values, pages);
    if (redirect)
      return redirect;
  }
  if (Array.isArray(form.redirectRules)) {
    for (const rule of form.redirectRules) {
      if (String(values[rule.when.field] ?? "") === rule.when.equals) {
        return resolveRedirectTarget(rule.redirectTo, rule.redirectToType, values, pages) ?? "/";
      }
    }
    return "/";
  }
  if (typeof form.redirectRules === "string") {
    return resolveRedirectTarget(form.redirectTo || form.redirectRules, form.redirectToType, values, pages) ?? "/";
  }
  return resolveRedirectTarget(form.redirectTo, form.redirectToType, values, pages) ?? "/";
}
function resolveRedirectTarget(target, type, values, pages) {
  const value = target?.trim();
  if (!value)
    return;
  if (type === "url") {
    const resolved = value.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(String(values[key] ?? "")));
    return isSafeRedirectUrl(resolved) ? resolved : undefined;
  }
  return pages.find((page) => page.id === value && page.visible)?.path;
}
function isSafeRedirectUrl(value) {
  if (value.startsWith("/") && !value.startsWith("//"))
    return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
function toGhlFormContact(form, values) {
  const allowed = new Set(form.fields.filter((field) => isFormFieldVisible(field, values)).map((field) => field.name));
  const submitted = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
  const { firstName, lastName } = splitName(submitted);
  return {
    firstName,
    lastName,
    name: stringValue(submitted.name) ?? stringValue(submitted.fullName),
    email: stringValue(submitted.email),
    phone: stringValue(submitted.phone),
    source: "Generated website form",
    tags: [
      "new lead",
      form.id === "contact-form" ? "web contact form" : "web lead form",
      ...form.tags
    ],
    customFields: Object.entries(submitted).filter(([key]) => !["name", "fullName", "firstName", "lastName", "email", "phone"].includes(key)).map(([key, value]) => ({ key, field_value: String(value) }))
  };
}
function splitName(values) {
  const fullName = stringValue(values.name) || stringValue(values.fullName) || `${stringValue(values.firstName) ?? ""} ${stringValue(values.lastName) ?? ""}`.trim();
  if (!fullName) {
    return {
      firstName: stringValue(values.firstName),
      lastName: stringValue(values.lastName)
    };
  }
  const [firstName, ...rest] = fullName.split(/\s+/);
  return { firstName, lastName: rest.join(" ") || stringValue(values.lastName) };
}
function stringValue(value) {
  return typeof value === "string" ? value : undefined;
}
var FORM_IFRAME_POLICY = "form";

// src/sections/bottom-cta-form.ts
var BottomCtaFormSectionSchema = SectionBaseSchema.extend({
  type: z6.literal("bottom_cta_form"),
  props: z6.object({
    source: FormPlacementSchema
  }).strict()
}).strict();

// src/sections/compare.ts
import { z as z7 } from "zod";
var CompareSectionSchema = SectionBaseSchema.extend({
  type: z7.literal("compare"),
  props: SectionHeadingSchema.extend({
    cards: z7.array(z7.object({
      title: z7.string().min(1),
      bullets: z7.array(z7.object({
        title: z7.string().min(1),
        description: z7.string().min(1)
      }).strict()).min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/contact-form.ts
import { z as z8 } from "zod";
var ContactFormSectionSchema = SectionBaseSchema.extend({
  type: z8.literal("contact_form_section"),
  props: SectionHeadingSchema.extend({
    eyebrow: z8.string().optional(),
    source: FormPlacementSchema,
    helpTitle: z8.string().min(1),
    helpDescription: z8.string().min(1),
    locationsTitle: z8.string().min(1).default("Our Locations"),
    hoursTitle: z8.string().min(1),
    hoursDescription: z8.string().min(1),
    hiddenLocationIds: z8.array(z8.string().min(1).max(128)).default([])
  }).strict()
}).strict();

// src/sections/external-widget.ts
import { z as z9 } from "zod";
var WidgetSettingSchema = z9.string().trim().min(1).max(200).regex(/^[^<>"'\u0000-\u001F\u007F]+$/, "Widget settings cannot contain HTML control characters");
var GymdeskExternalWidgetSettingsSchema = z9.object({
  gymId: z9.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/, "Gymdesk gym ID is invalid"),
  visibleSchedule: WidgetSettingSchema.default("All Schedules"),
  defaultSchedule: WidgetSettingSchema.default("All Schedules"),
  program: WidgetSettingSchema.default("All Programs"),
  schedule: WidgetSettingSchema.optional(),
  theme: WidgetSettingSchema.optional()
}).strict();
var ExternalWidgetSectionPropsSchema = z9.discriminatedUnion("provider", [
  z9.object({
    provider: z9.literal("gymdesk"),
    title: z9.string().trim().min(1).max(200),
    description: z9.string().trim().min(1).max(1000).optional(),
    settings: GymdeskExternalWidgetSettingsSchema
  }).strict()
]);
var ExternalWidgetSectionSchema = SectionBaseSchema.extend({
  type: z9.literal("external_widget"),
  props: ExternalWidgetSectionPropsSchema
}).strict();

// src/sections/faqs.ts
import { z as z10 } from "zod";
var FaqsSectionSchema = SectionBaseSchema.extend({
  type: z10.literal("faqs"),
  props: SectionHeadingSchema.extend({
    source: z10.literal("all-visible").optional(),
    faqIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/form.ts
import { z as z11 } from "zod";
var FormSectionSchema = SectionBaseSchema.extend({
  type: z11.literal("form"),
  props: z11.object({
    source: FormPlacementSchema,
    title: z11.string().min(1).optional(),
    description: z11.string().min(1).optional()
  }).strict()
}).strict();

// src/sections/gallery.ts
import { z as z12 } from "zod";
var GallerySectionSchema = MediaSectionBaseSchema.extend({
  type: z12.literal("gallery"),
  props: SectionHeadingSchema.extend({
    images: z12.array(SiteImageSchema).min(1).transform((images) => images.map((image, index) => ({
      ...image,
      id: image.id ?? `gallery-image-${index + 1}`
    }))).superRefine((images, issue) => {
      const ids = new Set;
      for (const [index, image] of images.entries()) {
        if (!SectionIdentifierSchema.safeParse(image.id).success || ids.has(image.id)) {
          issue.addIssue({
            code: "custom",
            message: "Gallery image IDs must be unique section identifiers",
            path: [index, "id"]
          });
        }
        ids.add(image.id);
      }
    })
  }).strict()
}).strict();

// src/sections/gfo-offer.ts
import { z as z13 } from "zod";
var GfoVideoSchema = z13.object({
  src: HttpsUrlSchema,
  title: z13.string().min(1)
}).strict().superRefine((video, issue) => {
  if (!toVideoEmbedUrl(video.src)) {
    issue.addIssue({
      code: "custom",
      message: "Video must be an embeddable YouTube, Vimeo, or VEED URL",
      path: ["src"]
    });
  }
});
var GfoOfferSectionSchema = SectionBaseSchema.extend({
  type: z13.literal("gfo_offer"),
  props: z13.object({
    notice: z13.string().min(1),
    title: z13.string().min(1),
    description: z13.string().min(1),
    video: GfoVideoSchema.optional(),
    countdownDays: z13.number().int().min(1).max(365).default(30),
    cta: SiteLinkSchema
  }).strict()
}).strict();

// src/sections/hero.ts
import { z as z14 } from "zod";
var HeroSectionSchema = MediaSectionBaseSchema.extend({
  type: z14.literal("hero"),
  props: z14.object({
    eyebrow: z14.string().optional(),
    title: z14.string().min(1),
    description: z14.string().min(1),
    image: SiteImageSchema.optional(),
    primaryCta: SiteLinkSchema.optional(),
    secondaryCta: SiteLinkSchema.optional()
  }).strict()
}).strict();

// src/sections/how-to-start.ts
import { z as z15 } from "zod";
var HowToStartSectionSchema = SectionBaseSchema.extend({
  type: z15.literal("how_to_start"),
  props: SectionHeadingSchema.extend({
    steps: z15.array(z15.object({
      title: z15.string().min(1),
      description: z15.string().min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/iframe-embed.ts
import { z as z16 } from "zod";
var IframeEmbedSectionSchema = SectionBaseSchema.extend({
  type: z16.literal("iframe_embed"),
  props: z16.object({
    title: z16.string().min(1),
    description: z16.string().optional(),
    src: HttpsUrlSchema,
    height: z16.number().int().min(240).max(1200).default(640),
    policy: z16.enum(["video", "form", "scheduler", "map"])
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
import { z as z17 } from "zod";
var NotSureSectionSchema = SectionBaseSchema.extend({
  type: z17.literal("not_sure"),
  props: SectionHeadingSchema.extend({
    cta: SiteLinkSchema
  }).strict()
}).strict();

// src/sections/plans.ts
import { z as z18 } from "zod";
var PlansSectionSchema = SectionBaseSchema.extend({
  type: z18.literal("plans"),
  props: z18.object({
    title: z18.string().min(1).default("Membership plans"),
    locationIds: z18.array(z18.string().min(1)).min(1),
    showLocationName: z18.boolean().default(true),
    display: z18.enum(["grouped", "tabs"]).default("grouped")
  }).strict()
}).strict();
var PlansSectionPropsSchema = PlansSectionSchema.shape.props;

// src/sections/schedules.ts
import { z as z19 } from "zod";
var SchedulesSectionSchema = SectionBaseSchema.extend({
  type: z19.literal("schedules"),
  props: z19.object({
    title: z19.string().min(1).default("Class schedule"),
    locationIds: z19.array(z19.string().min(1)).min(1),
    showLocationName: z19.boolean().default(true),
    display: z19.enum(["tabs", "combined"]).default("tabs")
  }).strict()
}).strict();
var SchedulesSectionPropsSchema = SchedulesSectionSchema.shape.props;

// src/sections/pricing-form.ts
import { z as z20 } from "zod";
var PricingFormSectionSchema = MediaSectionBaseSchema.extend({
  type: z20.literal("pricing_form_section"),
  props: SectionHeadingSchema.extend({
    eyebrow: z20.string().optional(),
    source: FormPlacementSchema
  }).strict()
}).strict();

// src/sections/program-detail.ts
import { z as z21 } from "zod";
var ProgramDetailSectionSchema = MediaSectionBaseSchema.extend({
  type: z21.literal("program_detail"),
  props: z21.object({
    programId: z21.string().min(1)
  }).strict()
}).strict();

// src/sections/programs.ts
import { z as z22 } from "zod";
var ProgramsSectionSchema = MediaSectionBaseSchema.extend({
  type: z22.literal("programs"),
  props: z22.object({
    eyebrow: z22.string().optional(),
    title: z22.string().min(1),
    source: z22.literal("all-visible").optional(),
    programIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/rich-text.ts
import { z as z23 } from "zod";
var RichTextSectionSchema = SectionBaseSchema.extend({
  type: z23.literal("rich_text"),
  props: z23.object({
    eyebrow: z23.string().optional(),
    title: z23.string().min(1),
    body: z23.array(z23.string().min(1)).min(1)
  }).strict()
}).strict();

// src/sections/sandboxed-embed.ts
import { z as z24 } from "zod";
var SandboxedEmbedSectionSchema = SectionBaseSchema.extend({
  type: z24.literal("sandboxed_embed"),
  props: z24.object({
    title: z24.string().trim().min(1).max(200),
    description: z24.string().trim().min(1).max(1000).optional(),
    embedId: z24.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    height: z24.number().int().min(240).max(1200).default(640)
  }).strict()
}).strict();

// src/sections/team.ts
import { z as z25 } from "zod";
var TeamSectionSchema = MediaSectionBaseSchema.extend({
  type: z25.literal("team"),
  props: z25.object({
    title: z25.string().min(1),
    source: z25.literal("all-visible").optional(),
    teamIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/testimonials.ts
import { z as z26 } from "zod";
var TestimonialsSectionSchema = MediaSectionBaseSchema.extend({
  type: z26.literal("testimonials"),
  props: SectionHeadingSchema.extend({
    source: z26.literal("all-visible").optional(),
    testimonialIds: OrderedIdsSchema
  }).strict()
}).strict();

// src/sections/text-iframe.ts
import { z as z27 } from "zod";
var TextIframeSectionSchema = SectionBaseSchema.extend({
  type: z27.literal("text_iframe"),
  props: SectionHeadingSchema.extend({
    src: HttpsUrlSchema,
    height: z27.number().int().min(240).max(1200).default(640),
    policy: z27.enum(["video", "form", "scheduler", "map"])
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
import { z as z28 } from "zod";
var ThreeBoxSectionSchema = SectionBaseSchema.extend({
  type: z28.literal("three_box"),
  props: z28.object({
    title: z28.string().min(1),
    boxes: z28.array(z28.object({
      title: z28.string().min(1),
      description: z28.string().min(1)
    }).strict()).min(1)
  }).strict()
}).strict();

// src/sections/top-review.ts
import { z as z29 } from "zod";
var TopReviewSectionSchema = MediaSectionBaseSchema.extend({
  type: z29.literal("top_review"),
  props: z29.object({
    reviewCount: z29.number().int().nonnegative(),
    averageRating: z29.number().min(0).max(5),
    totalCustomers: z29.number().int().nonnegative(),
    reviews: z29.array(z29.object({
      id: SectionIdentifierSchema.optional(),
      name: z29.string().min(1),
      title: z29.string().min(1),
      review: z29.string().min(1),
      image: SiteImageSchema.optional()
    }).strict()).min(1).transform((reviews) => reviews.map((review, index) => ({
      ...review,
      id: review.id ?? `top-review-${index + 1}`
    }))).superRefine((reviews, issue) => {
      const ids = new Set;
      for (const [index, review] of reviews.entries()) {
        if (ids.has(review.id)) {
          issue.addIssue({
            code: "custom",
            message: "Top review IDs must be unique",
            path: [index, "id"]
          });
        }
        ids.add(review.id);
      }
    })
  }).strict()
}).strict();

// src/sections/index.ts
function sectionSupportsImageTarget(section, target) {
  if ((target.kind === "section" || target.kind === "section-item") && target.sectionId !== section.id) {
    return false;
  }
  switch (section.type) {
    case "hero":
    case "about":
    case "bottom_cta":
      return target.kind === "section" && target.slot === "image";
    case "gallery":
      return target.kind === "section-item" && target.slot === "images" && section.props.images.some((image) => image.id === target.itemId);
    case "top_review":
      return target.kind === "section-item" && target.slot === "reviews.image" && section.props.reviews.some((review) => review.id === target.itemId);
    case "programs":
      return target.kind === "content" && target.collection === "programs" && target.slot === "image";
    case "team":
      return target.kind === "content" && target.collection === "teams" && target.slot === "image";
    case "testimonials":
    case "pricing_form_section":
      return target.kind === "content" && target.collection === "testimonials" && target.slot === "avatar";
    case "program_detail":
      return target.kind === "content" && target.collection === "programs" && target.slot === "detail.image" && target.itemId === section.props.programId;
    default:
      return false;
  }
}
var SiteSectionUnionSchema = z30.discriminatedUnion("type", [
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
  GfoOfferSectionSchema,
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
var SiteSectionSchema = SiteSectionUnionSchema.superRefine((section, issue) => {
  if (!("presentation" in section) || !section.presentation?.imageOverrides) {
    return;
  }
  for (const [index, override] of section.presentation.imageOverrides.entries()) {
    if (!sectionSupportsImageTarget(section, override.target)) {
      issue.addIssue({
        code: "custom",
        message: `Image target is not supported by ${section.type}`,
        path: ["presentation", "imageOverrides", index, "target"]
      });
    }
  }
});

// src/collections.ts
var SlugSchema = z31.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
var OrderedContentSchema = z31.object({
  id: z31.string().min(1),
  visible: z31.boolean().default(true),
  order: z31.number().int().optional()
});
var SiteProgramSchema = OrderedContentSchema.extend({
  slug: SlugSchema,
  name: z31.string().min(1),
  description: z31.string().min(1),
  image: SiteImageSchema.optional(),
  showLearnMore: z31.boolean().default(true),
  detail: z31.object({
    title: z31.string().min(1),
    ageRange: z31.string().min(1),
    ageMinimum: z31.number().int().nonnegative().optional(),
    ageMaximum: z31.number().int().nonnegative().optional(),
    previousRequirement: z31.string().min(1),
    description: z31.string().min(1),
    image: SiteImageSchema.optional(),
    challengeHeading: z31.string().min(1),
    challenges: z31.array(z31.string().min(1)).min(1)
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
  name: z31.string().min(1),
  description: z31.string().min(1),
  role: z31.string().min(1).optional(),
  isFounder: z31.boolean().optional(),
  image: SiteImageSchema.optional()
}).strict();
var SiteTestimonialSchema = OrderedContentSchema.extend({
  name: z31.string().min(1),
  location: z31.string().min(1),
  text: z31.string().min(1),
  avatar: SiteImageSchema.optional()
}).strict();
var SiteFaqSchema = OrderedContentSchema.extend({
  question: z31.string().min(1),
  answer: z31.string().min(1)
}).strict();
var SiteContentSchema = z31.object({
  programs: z31.array(SiteProgramSchema).default([]),
  teams: z31.array(SiteTeamMemberSchema).default([]),
  testimonials: z31.array(SiteTestimonialSchema).default([]),
  faqs: z31.array(SiteFaqSchema).default([])
}).strict();

// src/context.ts
import { z as z33 } from "zod";

// src/locations.ts
import { z as z32 } from "zod";
var SiteLocationSlugSchema = z32.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Location must be a stable slug");
var SitePostalAddressSchema = z32.object({
  streetAddress: z32.string().min(1).optional(),
  addressLocality: z32.string().min(1).optional(),
  addressRegion: z32.string().min(1).optional(),
  postalCode: z32.string().min(1).optional(),
  addressCountry: z32.string().min(2)
}).strict();
var SiteOpeningHoursSchema = z32.object({
  dayOfWeek: z32.array(z32.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ])).min(1),
  opens: z32.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  closes: z32.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
}).strict();
var SiteLocationSchema = z32.object({
  id: z32.string().min(1).max(128),
  name: z32.string().min(1),
  slug: SiteLocationSlugSchema,
  googlePlaceId: z32.string().trim().min(1).max(256).optional(),
  address: z32.string().min(1).optional(),
  postalAddress: SitePostalAddressSchema.optional(),
  phone: z32.string().min(1).optional(),
  email: z32.string().min(1).optional(),
  timezone: z32.string().min(1),
  paymentGateway: z32.enum(["square", "stripe", "authorize"]).nullable().optional(),
  currency: z32.string().length(3).optional(),
  coordinates: z32.object({
    latitude: z32.number().min(-90).max(90),
    longitude: z32.number().min(-180).max(180)
  }).strict().optional(),
  openingHours: z32.array(SiteOpeningHoursSchema).optional(),
  rating: z32.number().min(0).max(5).optional(),
  reviewCount: z32.number().int().nonnegative().optional()
}).strict();
var RenderedSiteLocationSchema = SiteLocationSchema.extend({
  mapQuery: z32.string().min(1).max(500).optional(),
  hoursDescription: z32.string().min(1).max(2000).optional()
}).strict();
var SiteLocationOverrideSchema = z32.object({
  name: z32.string().trim().max(200).optional(),
  mapQuery: z32.string().trim().max(500).optional(),
  address: z32.object({
    streetAddress: z32.string().trim().max(500).optional(),
    addressLocality: z32.string().trim().max(200).optional(),
    addressRegion: z32.string().trim().max(200).optional(),
    postalCode: z32.string().trim().max(50).optional(),
    addressCountry: z32.string().trim().max(100).optional()
  }).strict().optional(),
  phone: z32.string().trim().max(100).optional(),
  email: z32.string().trim().max(320).optional(),
  hoursDescription: z32.string().trim().max(2000).optional()
}).strict();
var SiteManualLocationSchema = SiteLocationOverrideSchema.extend({
  id: z32.string().min(1).max(128),
  name: z32.string().trim().min(1).max(200)
}).strict();
function manualLocationForDisplay(location) {
  const { address, ...display } = location;
  return {
    ...display,
    ...address ? { postalAddress: address } : {}
  };
}
var SiteLocationConnectionSchema = z32.object({
  locationId: z32.string().min(1).max(128),
  isPrimary: z32.boolean(),
  displayOrder: z32.number().int().nonnegative(),
  override: SiteLocationOverrideSchema.optional()
}).strict();
var SiteLocationLeadRoutingSchema = z32.object({
  ghlLocationId: z32.string().trim().max(255),
  privateIntegrationToken: z32.string().trim().max(4096)
}).strict();
var StoredSiteLocationConnectionSchema = SiteLocationConnectionSchema.extend({
  leadRouting: SiteLocationLeadRoutingSchema
}).strict();
function overriddenText(source, override) {
  if (override === undefined)
    return source;
  return override || undefined;
}
function formatSiteLocationAddress(location) {
  if (!location)
    return;
  const address = location.postalAddress;
  const streetAddress = address?.streetAddress ?? location.address;
  if (!address)
    return streetAddress;
  const regionPostalCode = [address.addressRegion, address.postalCode].filter(Boolean).join(" ");
  return [
    streetAddress,
    address.addressLocality,
    regionPostalCode || undefined,
    address.addressCountry
  ].filter(Boolean).join(", ") || undefined;
}
function applySiteLocationOverride(location, value) {
  if (!value)
    return location;
  const next = { ...location };
  const name = overriddenText(location.name, value.name);
  next.name = name ?? location.name;
  next.phone = overriddenText(location.phone, value.phone);
  next.email = overriddenText(location.email, value.email);
  if (value.address && Object.keys(value.address).length > 0) {
    const current = location.postalAddress;
    const overridden = value.address;
    const streetAddress = overriddenText(current?.streetAddress ?? location.address, overridden.streetAddress);
    const addressLocality = overriddenText(current?.addressLocality, overridden.addressLocality);
    const addressRegion = overriddenText(current?.addressRegion, overridden.addressRegion);
    const postalCode = overriddenText(current?.postalCode, overridden.postalCode);
    const addressCountry = overriddenText(current?.addressCountry, overridden.addressCountry);
    const postalAddress = addressCountry && addressCountry.length >= 2 ? SitePostalAddressSchema.parse({
      addressCountry,
      ...streetAddress ? { streetAddress } : {},
      ...addressLocality ? { addressLocality } : {},
      ...addressRegion ? { addressRegion } : {},
      ...postalCode ? { postalCode } : {}
    }) : undefined;
    next.postalAddress = postalAddress;
    const formattedAddress = [
      streetAddress,
      addressLocality,
      [addressRegion, postalCode].filter(Boolean).join(" ") || undefined,
      addressCountry
    ].filter(Boolean).join(", ");
    next.address = (postalAddress ? formatSiteLocationAddress({ ...location, address: undefined, postalAddress }) : undefined) ?? (formattedAddress || undefined);
    next.googlePlaceId = undefined;
    next.coordinates = undefined;
  }
  return SiteLocationSchema.parse(next);
}
function locationBySlug(locations, slug) {
  return locations.find((location) => location.slug === slug) ?? null;
}
function locationById(locations, id2) {
  return locations.find((location) => location.id === id2) ?? null;
}
function orderedAllowedLocations(locations, allowedLocationIds) {
  const byId = new Map(locations.map((location) => [location.id, location]));
  return allowedLocationIds.flatMap((id2) => {
    const location = byId.get(id2);
    return location ? [location] : [];
  });
}
function resolveSelectedLocation(locations, primaryLocationId, requestedSlug) {
  if (requestedSlug !== undefined && requestedSlug !== null) {
    return locationBySlug(locations, requestedSlug);
  }
  return locationById(locations, primaryLocationId);
}

// src/context.ts
var SiteCapabilitiesSchema = z33.object({
  blog: z33.boolean(),
  commerce: z33.boolean(),
  schedules: z33.boolean(),
  downloads: z33.boolean(),
  memberAuth: z33.boolean()
}).strict();
var TenantContextObjectSchema = z33.object({
  siteId: z33.string().min(1).max(128),
  vendorId: z33.string().min(1).max(128),
  primaryLocationId: z33.string().min(1).max(128),
  allowedLocationIds: z33.array(z33.string().min(1).max(128)).min(1),
  locations: z33.array(SiteLocationSchema).min(1),
  domain: z33.string().min(1).max(253),
  domainSource: z33.enum(["custom", "wildcard"]),
  canonicalDomain: z33.string().min(1).max(253).nullable(),
  isCanonicalDomain: z33.boolean(),
  publishedRevisionId: z33.string().min(1).max(128),
  capabilities: SiteCapabilitiesSchema
}).strict();
function validateTenantContext(context, issue) {
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
  if (locationIds.size !== context.locations.length || locationIds.size !== allowedIds.size || [...locationIds].some((id2) => !allowedIds.has(id2))) {
    issue.addIssue({
      code: "custom",
      message: "Location metadata must match the allowed location IDs",
      path: ["locations"]
    });
  }
}
var TenantContextSchema = TenantContextObjectSchema.superRefine(validateTenantContext);
var RenderedTenantContextSchema = TenantContextObjectSchema.extend({
  locations: z33.array(RenderedSiteLocationSchema).min(1)
}).strict().superRefine(validateTenantContext);

// src/scripts-and-embeds.ts
import { z as z34 } from "zod";
var MAX_SITE_CUSTOM_EMBED_BYTES = 75000;
var MAX_SITE_SANDBOXED_EMBED_BYTES = 75000;
var SiteScriptPurposeSchema = z34.enum([
  "functional",
  "analytics",
  "marketing"
]);
var SiteScriptPlacementSchema = z34.enum([
  "head",
  "body_start",
  "body_end"
]);
var SiteScriptEntryBaseSchema = z34.object({
  id: z34.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z34.string().trim().min(1).max(120),
  enabled: z34.boolean(),
  purpose: SiteScriptPurposeSchema
});
var SiteGtmEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z34.literal("gtm"),
  containerId: z34.string().trim().regex(/^GTM-[A-Z0-9]+$/i)
}).strict();
var SiteGoogleTagEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z34.literal("google_tag"),
  tagId: z34.string().trim().regex(/^(?:GT|G|AW|DC)-[A-Z0-9]+$/i)
}).strict();
var SiteMetaPixelEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z34.literal("meta_pixel"),
  pixelId: z34.string().trim().regex(/^\d{5,32}$/)
}).strict();
var SiteTikTokPixelEntrySchema = SiteScriptEntryBaseSchema.extend({
  kind: z34.literal("tiktok_pixel"),
  pixelId: z34.string().trim().regex(/^[A-Z0-9]{10,32}$/i)
}).strict();
var ReferrerPolicySchema = z34.enum([
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url"
]);
var SiteCustomScriptAttributesSchema = z34.object({
  async: z34.boolean().optional(),
  defer: z34.boolean().optional(),
  crossOrigin: z34.enum(["anonymous", "use-credentials"]).optional(),
  integrity: z34.string().trim().min(1).max(1024).optional(),
  module: z34.boolean().optional(),
  referrerPolicy: ReferrerPolicySchema.optional(),
  data: z34.record(z34.string().regex(/^[a-z0-9_.:-]+$/i), z34.string().max(4096)).optional()
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
var SiteCustomExternalScriptPartSchema = z34.object({
  type: z34.literal("external_script"),
  src: z34.string().trim().max(4096).refine(isAllowedScriptUrl, "External scripts require a same-origin path or credential-free HTTPS URL"),
  attributes: SiteCustomScriptAttributesSchema.default({})
}).strict();
var SiteCustomInlineScriptPartSchema = z34.object({
  type: z34.literal("inline_script"),
  code: z34.string().min(1).max(50000).refine((value) => !/\bdocument\s*\.\s*write(?:ln)?\s*\(/i.test(value), "document.write is not supported"),
  module: z34.boolean().optional()
}).strict();
var SiteCustomMarkupPartSchema = z34.object({
  type: z34.literal("markup"),
  html: z34.string().min(1).max(75000).refine((value) => !/<\/?script\b/i.test(value), "Markup parts cannot contain script tags")
}).strict();
var SiteCustomEmbedPartSchema = z34.discriminatedUnion("type", [
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
  kind: z34.literal("custom"),
  placement: SiteScriptPlacementSchema,
  parts: z34.array(SiteCustomEmbedPartSchema).min(1).max(40)
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
  kind: z34.literal("sandboxed_embed"),
  source: z34.string().max(MAX_SITE_SANDBOXED_EMBED_BYTES).refine((value) => value.trim().length > 0, "Sandboxed embed source is required")
}).strict().superRefine((entry, issue) => {
  if (utf8ByteLength(entry.source) > MAX_SITE_SANDBOXED_EMBED_BYTES) {
    issue.addIssue({
      code: "custom",
      message: "Sandboxed embed content cannot exceed 75 KB",
      path: ["source"]
    });
  }
});
var SiteScriptEntrySchema = z34.discriminatedUnion("kind", [
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
var SiteScriptsAndEmbedsSchema = z34.object({
  enabled: z34.boolean().default(true),
  entries: z34.array(SiteScriptEntrySchema).max(20).default([])
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
var NavigationItemSchema = z35.lazy(() => z35.discriminatedUnion("type", [
  z35.object({
    type: z35.literal("link"),
    id: z35.string().min(1),
    label: z35.string().min(1),
    href: SiteHrefSchema,
    external: z35.boolean(),
    visible: z35.boolean()
  }).strict(),
  z35.object({
    type: z35.literal("group"),
    id: z35.string().min(1),
    label: z35.string().min(1),
    visible: z35.boolean(),
    items: z35.array(NavigationItemSchema).min(1)
  }).strict()
]));
var SiteHeaderActionSchema = z35.discriminatedUnion("kind", [
  z35.object({
    kind: z35.literal("link"),
    label: z35.string().min(1).max(100),
    href: SiteHrefSchema,
    external: z35.boolean()
  }).strict(),
  z35.object({ kind: z35.literal("hidden") }).strict()
]);
var HexColorSchema = z35.string().regex(/^#[0-9a-f]{6}$/i);
var PagePathSchema = z35.string().regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
var SiteThemeSchema = z35.object({
  colors: z35.object({
    primary: HexColorSchema,
    background: HexColorSchema,
    foreground: HexColorSchema,
    muted: HexColorSchema,
    accent: HexColorSchema
  }).strict(),
  typography: z35.object({
    heading: z35.enum(["sans", "serif"]),
    body: z35.enum(["sans", "serif"])
  }).strict(),
  radius: z35.enum(["none", "small", "medium", "large"])
}).strict();
var SitePageHeaderSchema = z35.object({
  mode: z35.enum(["auto", "overlay", "stacked", "sticky"]).default("auto"),
  contrast: z35.enum(["auto", "light", "dark"]).default("auto")
}).strict();
var SitePageBaseSchema = z35.object({
  id: z35.string().min(1),
  path: PagePathSchema,
  visible: z35.boolean(),
  metadata: z35.object({
    title: z35.string().min(1),
    description: z35.string().optional(),
    openGraphImage: SiteImageSchema.optional(),
    indexable: z35.boolean().optional()
  }).strict(),
  header: SitePageHeaderSchema.optional()
});
var SiteSectionsPageSchema = SitePageBaseSchema.extend({
  kind: z35.literal("sections").default("sections"),
  displayLocationId: z35.string().min(1).max(128).optional(),
  sections: z35.array(SiteSectionSchema).min(1)
}).strict();
var SitePageTemplateSchema = z35.object({
  schemaVersion: z35.literal(2),
  page: z35.object({
    metadata: z35.object({
      description: z35.string().optional(),
      openGraphImage: SiteImageSchema.optional(),
      indexable: z35.boolean().optional()
    }).strict(),
    sections: z35.array(SiteSectionSchema).min(1)
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
var BuiltinPageIdSchema = z35.enum(["schedules", "blog", "download", "shop", "shop-plans"]);
var BUILTIN_PAGE_PATHS = {
  "/schedules": "schedules",
  "/blog": "blog",
  "/download": "download",
  "/shop": "shop",
  "/shop/plans": "shop-plans"
};
var SiteBuiltinPageSchema = SitePageBaseSchema.extend({
  kind: z35.literal("builtin"),
  id: BuiltinPageIdSchema,
  path: z35.enum(["/schedules", "/blog", "/download", "/shop", "/shop/plans"])
}).strict().refine((page) => BUILTIN_PAGE_PATHS[page.path] === page.id, "Builtin page ID and path must match");
var SitePageSchema = z35.union([
  SiteSectionsPageSchema,
  SiteBuiltinPageSchema
]);
function getFormPlacement(section) {
  switch (section.type) {
    case "form":
    case "contact_form_section":
    case "pricing_form_section":
    case "bottom_cta_form":
      return section.props.source;
    default:
      return null;
  }
}
function getNativeFormPlacement(section) {
  const placement = getFormPlacement(section);
  return placement?.kind === "native" ? placement : null;
}
var PublicSiteConfigObjectSchema = z35.object({
  schemaVersion: z35.union([z35.literal(2), z35.literal(3)]),
  locale: z35.string().min(2),
  business: z35.object({
    name: z35.string().min(1),
    tagline: z35.string().min(1),
    logo: SiteImageSchema.optional(),
    structuredDataType: z35.enum([
      "LocalBusiness",
      "SportsActivityLocation",
      "EducationalOrganization",
      "Organization"
    ])
  }).strict(),
  metadata: z35.object({
    defaultTitle: z35.string().min(1),
    titleTemplate: z35.string().min(1),
    defaultDescription: z35.string().min(1),
    openGraphImage: SiteImageSchema.optional(),
    googleSiteVerification: z35.string().min(1).optional()
  }).strict(),
  theme: SiteThemeSchema,
  headerAction: SiteHeaderActionSchema.optional(),
  navigation: z35.array(NavigationItemSchema),
  footer: z35.object({
    credit: z35.string(),
    links: z35.array(NavigationItemSchema),
    locationsTitle: z35.string().min(1).default("Our Locations"),
    hiddenLocationIds: z35.array(z35.string().min(1).max(128)).default([])
  }).strict(),
  locationConnections: z35.array(SiteLocationConnectionSchema).min(1).optional(),
  manualLocations: z35.array(SiteManualLocationSchema).default([]),
  locationOverride: SiteLocationOverrideSchema.optional(),
  content: SiteContentSchema.default({
    programs: [],
    teams: [],
    testimonials: [],
    faqs: []
  }),
  pages: z35.array(SitePageSchema).min(1),
  forms: z35.array(SiteFormSchema),
  capabilities: SiteCapabilitiesSchema,
  scriptsAndEmbeds: SiteScriptsAndEmbedsSchema.default({
    enabled: true,
    entries: []
  })
}).strict();
var PublicSiteConfigSchema = PublicSiteConfigObjectSchema.superRefine((config, issue) => {
  const pageIds = new Set;
  const pagePaths = new Set;
  const formIds = new Set;
  const connectedLocationIds = new Set;
  const manualLocationIds = new Set;
  const sandboxedEmbedIds = new Set(config.scriptsAndEmbeds.entries.flatMap((entry) => entry.kind === "sandboxed_embed" ? [entry.id] : []));
  const contentIds = {
    programs: new Set,
    teams: new Set,
    testimonials: new Set,
    faqs: new Set
  };
  if (config.schemaVersion === 3 && !config.locationConnections) {
    issue.addIssue({
      code: "custom",
      message: "Schema v3 requires connected locations",
      path: ["locationConnections"]
    });
  }
  if (config.locationConnections) {
    const displayOrders = new Set;
    let primaryCount = 0;
    for (const [index, connection] of config.locationConnections.entries()) {
      if (connectedLocationIds.has(connection.locationId)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate connected location ID: ${connection.locationId}`,
          path: ["locationConnections", index, "locationId"]
        });
      }
      connectedLocationIds.add(connection.locationId);
      if (displayOrders.has(connection.displayOrder)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate location display order: ${connection.displayOrder}`,
          path: ["locationConnections", index, "displayOrder"]
        });
      }
      displayOrders.add(connection.displayOrder);
      if (connection.isPrimary)
        primaryCount += 1;
    }
    if (primaryCount !== 1) {
      issue.addIssue({
        code: "custom",
        message: "Exactly one connected location must be primary",
        path: ["locationConnections"]
      });
    }
    for (let order = 0;order < config.locationConnections.length; order += 1) {
      if (!displayOrders.has(order)) {
        issue.addIssue({
          code: "custom",
          message: "Connected location display order must be contiguous from zero",
          path: ["locationConnections"]
        });
        break;
      }
    }
  }
  for (const [index, location] of config.manualLocations.entries()) {
    if (manualLocationIds.has(location.id) || connectedLocationIds.has(location.id)) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate display location ID: ${location.id}`,
        path: ["manualLocations", index, "id"]
      });
    }
    manualLocationIds.add(location.id);
  }
  const displayLocationIds = new Set([
    ...connectedLocationIds,
    ...manualLocationIds
  ]);
  const hasDisplayLocations = Boolean(config.locationConnections) || config.manualLocations.length > 0;
  if (hasDisplayLocations) {
    for (const [index, locationId] of config.footer.hiddenLocationIds.entries()) {
      if (!displayLocationIds.has(locationId)) {
        issue.addIssue({
          code: "custom",
          message: `Footer hides an unknown display location: ${locationId}`,
          path: ["footer", "hiddenLocationIds", index]
        });
      }
    }
  }
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
    for (const id2 of ids ?? []) {
      if (!knownIds.has(id2)) {
        issue.addIssue({
          code: "custom",
          message: `Unknown ${label} ID: ${id2}`,
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
    if (page.displayLocationId && !displayLocationIds.has(page.displayLocationId)) {
      issue.addIssue({
        code: "custom",
        message: `Page references an unknown display location: ${page.displayLocationId}`,
        path: ["pages"]
      });
    }
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
      const nativeFormPlacement = getNativeFormPlacement(section);
      const formId = nativeFormPlacement?.formId;
      if (formId && !formIds.has(formId)) {
        issue.addIssue({
          code: "custom",
          message: `Unknown form ID: ${formId}`,
          path: ["pages"]
        });
      }
      const fixedLocationId = nativeFormPlacement?.fixedLocationId;
      if (fixedLocationId && config.locationConnections && !connectedLocationIds.has(fixedLocationId)) {
        issue.addIssue({
          code: "custom",
          message: `Form placement references an unconnected location: ${fixedLocationId}`,
          path: ["pages"]
        });
      }
      if (section.type === "contact_form_section" && hasDisplayLocations) {
        for (const locationId of section.props.hiddenLocationIds) {
          if (!displayLocationIds.has(locationId)) {
            issue.addIssue({
              code: "custom",
              message: `Contact section hides an unknown display location: ${locationId}`,
              path: ["pages"]
            });
          }
        }
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
function publicConfigInput(config) {
  return {
    ...config,
    locationConnections: config.locationConnections.map((connection) => ({
      locationId: connection.locationId,
      isPrimary: connection.isPrimary,
      displayOrder: connection.displayOrder,
      ...connection.override ? { override: connection.override } : {}
    }))
  };
}
var StoredSiteConfigObjectSchema = PublicSiteConfigObjectSchema.omit({ schemaVersion: true, locationConnections: true, locationOverride: true }).extend({
  schemaVersion: z35.literal(3),
  locationConnections: z35.array(StoredSiteLocationConnectionSchema).min(1)
}).strict();
var StoredSiteConfigSchema = StoredSiteConfigObjectSchema.superRefine((config, issue) => {
  const parsedPublic = PublicSiteConfigSchema.safeParse(publicConfigInput(config));
  if (parsedPublic.success)
    return;
  for (const problem of parsedPublic.error.issues) {
    issue.addIssue({
      code: "custom",
      message: problem.message,
      path: problem.path
    });
  }
});
var PublishableStoredSiteConfigSchema = StoredSiteConfigSchema.superRefine((config, issue) => {
  const ghlLocationIds = new Set;
  for (const [index, connection] of config.locationConnections.entries()) {
    const { ghlLocationId, privateIntegrationToken } = connection.leadRouting;
    if (!ghlLocationId.trim()) {
      issue.addIssue({
        code: "custom",
        message: `Missing GHL Location ID for connected location: ${connection.locationId}`,
        path: ["locationConnections", index, "leadRouting", "ghlLocationId"]
      });
    } else if (ghlLocationIds.has(ghlLocationId.trim())) {
      issue.addIssue({
        code: "custom",
        message: `Duplicate GHL Location ID: ${ghlLocationId.trim()}`,
        path: ["locationConnections", index, "leadRouting", "ghlLocationId"]
      });
    }
    ghlLocationIds.add(ghlLocationId.trim());
    if (!privateIntegrationToken.trim()) {
      issue.addIssue({
        code: "custom",
        message: `Missing GHL private integration token for connected location: ${connection.locationId}`,
        path: ["locationConnections", index, "leadRouting", "privateIntegrationToken"]
      });
    }
  }
});
function toPublicSiteConfig(config) {
  return PublicSiteConfigSchema.parse(publicConfigInput(config));
}
function resolveRenderedTenantContext(config, context) {
  const connectionByLocation = new Map(config.locationConnections?.map((connection) => [connection.locationId, connection]) ?? []);
  return RenderedTenantContextSchema.parse({
    ...context,
    locations: context.locations.map((location) => {
      const connection = connectionByLocation.get(location.id);
      const override = connection?.override ?? (location.id === context.primaryLocationId ? config.locationOverride : undefined);
      return {
        ...applySiteLocationOverride(location, override),
        ...override?.mapQuery ? { mapQuery: override.mapQuery } : {},
        ...override?.hoursDescription ? { hoursDescription: override.hoursDescription } : {}
      };
    })
  });
}
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
function parsePublicSiteConfig(input) {
  return PublicSiteConfigSchema.parse(input);
}
function parseStoredSiteConfig(input) {
  return StoredSiteConfigSchema.parse(input);
}
// src/external-widget-snippet.ts
var GYMDESK_WIDGET_SCRIPT_URL = "https://app.gymdesk.com/js/widgets.js";
function parseAttributes(source) {
  const attributes = new Map;
  let cursor = 0;
  while (cursor < source.length) {
    while (/\s/.test(source[cursor] ?? ""))
      cursor += 1;
    if (cursor >= source.length)
      break;
    const nameMatch = /^[A-Za-z_:][A-Za-z0-9_.:-]*/.exec(source.slice(cursor));
    if (!nameMatch)
      throw new Error("The Gymdesk snippet contains invalid HTML attributes.");
    const name = nameMatch[0].toLowerCase();
    cursor += nameMatch[0].length;
    while (/\s/.test(source[cursor] ?? ""))
      cursor += 1;
    let value = null;
    if (source[cursor] === "=") {
      cursor += 1;
      while (/\s/.test(source[cursor] ?? ""))
        cursor += 1;
      const quote = source[cursor];
      if (quote !== '"' && quote !== "'") {
        throw new Error("Gymdesk attribute values must be quoted.");
      }
      cursor += 1;
      const end = source.indexOf(quote, cursor);
      if (end < 0)
        throw new Error("The Gymdesk snippet has an unclosed attribute value.");
      value = source.slice(cursor, end);
      cursor = end + 1;
    }
    if (attributes.has(name)) {
      throw new Error(`The Gymdesk snippet repeats the ${name} attribute.`);
    }
    attributes.set(name, value);
  }
  return attributes;
}
function requiredAttribute(attributes, name) {
  const value = attributes.get(name);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`The Gymdesk snippet is missing ${name}.`);
  }
  return value;
}
function optionalAttribute(attributes, name) {
  const value = attributes.get(name);
  return typeof value === "string" && value.trim() ? value : undefined;
}
function parseGymdeskScheduleSnippet(source) {
  if (!source.trim() || source.length > 1e4) {
    throw new Error("Paste the complete Gymdesk schedule snippet.");
  }
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "").trim();
  const tags = withoutComments.match(/^<script\b([^>]*)>\s*<\/script\s*>\s*<div\b([^>]*)>\s*<\/div\s*>$/i);
  if (!tags) {
    throw new Error("Paste one Gymdesk widget script followed by one Gymdesk schedule div.");
  }
  const scriptAttributes = parseAttributes(tags[1] ?? "");
  const allowedScriptAttributes = new Set(["src", "type", "async", "defer"]);
  for (const [name, value] of scriptAttributes) {
    if (!allowedScriptAttributes.has(name)) {
      throw new Error(`The Gymdesk script attribute ${name} is not supported.`);
    }
    if ((name === "async" || name === "defer") && value !== null) {
      throw new Error(`The Gymdesk ${name} attribute must not have a value.`);
    }
  }
  const scriptType = optionalAttribute(scriptAttributes, "type");
  if (scriptType && scriptType.toLowerCase() !== "text/javascript") {
    throw new Error("The Gymdesk script type is not supported.");
  }
  let scriptUrl;
  try {
    scriptUrl = new URL(requiredAttribute(scriptAttributes, "src"));
  } catch {
    throw new Error("The Gymdesk widget script URL is invalid.");
  }
  if (scriptUrl.href !== GYMDESK_WIDGET_SCRIPT_URL) {
    throw new Error("Only the official Gymdesk widget script is supported.");
  }
  const widgetAttributes = parseAttributes(tags[2] ?? "");
  const allowedWidgetAttributes = new Set([
    "class",
    "attr-gym",
    "attr-visible_schedule",
    "attr-default_schedule",
    "attr-program",
    "attr-schedule",
    "attr-theme"
  ]);
  for (const name of widgetAttributes.keys()) {
    if (!allowedWidgetAttributes.has(name)) {
      throw new Error(`The Gymdesk schedule attribute ${name} is not supported.`);
    }
  }
  const classNames = requiredAttribute(widgetAttributes, "class").split(/\s+/).filter(Boolean);
  if (classNames.length !== 1 || classNames[0] !== "gymdesk-schedule") {
    throw new Error("The widget must use the gymdesk-schedule class.");
  }
  return GymdeskExternalWidgetSettingsSchema.parse({
    gymId: requiredAttribute(widgetAttributes, "attr-gym"),
    visibleSchedule: optionalAttribute(widgetAttributes, "attr-visible_schedule"),
    defaultSchedule: optionalAttribute(widgetAttributes, "attr-default_schedule"),
    program: optionalAttribute(widgetAttributes, "attr-program"),
    schedule: optionalAttribute(widgetAttributes, "attr-schedule"),
    theme: optionalAttribute(widgetAttributes, "attr-theme")
  });
}
// src/editor-targets.ts
var SITE_FOOTER_EDITOR_TARGET_ID = "site-footer";
var GLOBAL_SITE_EDITOR_TARGETS = [{
  id: SITE_FOOTER_EDITOR_TARGET_ID,
  type: "footer",
  label: "Footer"
}];
// src/location-config.ts
function normalizeStoredLocationConnections(connections) {
  const primary = connections.find((connection) => connection.isPrimary);
  const ordered = primary ? [
    primary,
    ...connections.filter((connection) => connection.locationId !== primary.locationId)
  ] : [...connections];
  return ordered.map((connection, displayOrder) => ({
    ...connection,
    displayOrder
  }));
}
function siteLocationReferences(config, locationId) {
  return config.pages.flatMap((page) => {
    if (page.kind === "builtin")
      return [];
    const pageReference = page.displayLocationId === locationId ? [`${page.path} \xB7 location page`] : [];
    return [
      ...pageReference,
      ...page.sections.flatMap((section) => {
        const formPlacement = getNativeFormPlacement(section);
        const liveLocationIds = section.type === "schedules" || section.type === "plans" ? section.props.locationIds : [];
        return formPlacement?.fixedLocationId === locationId || liveLocationIds.includes(locationId) ? [`${page.path} \xB7 ${section.id}`] : [];
      })
    ];
  });
}
function pruneLocationReferences(config, remaining) {
  return {
    footer: {
      ...config.footer,
      hiddenLocationIds: config.footer.hiddenLocationIds.filter((id2) => remaining.has(id2))
    },
    pages: config.pages.map((page) => {
      if (page.kind === "builtin")
        return page;
      const nextPage = { ...page };
      if (nextPage.displayLocationId && !remaining.has(nextPage.displayLocationId)) {
        delete nextPage.displayLocationId;
      }
      return {
        ...nextPage,
        sections: nextPage.sections.map((section) => section.type === "contact_form_section" ? {
          ...section,
          props: {
            ...section.props,
            hiddenLocationIds: section.props.hiddenLocationIds.filter((id2) => remaining.has(id2))
          }
        } : section)
      };
    })
  };
}
function withStoredLocationConnections(config, connections) {
  const locationConnections = normalizeStoredLocationConnections(connections);
  const remaining = new Set([
    ...locationConnections.map((connection) => connection.locationId),
    ...config.manualLocations.map((location) => location.id)
  ]);
  return StoredSiteConfigSchema.parse({
    ...config,
    locationConnections,
    ...pruneLocationReferences(config, remaining)
  });
}
function withManualLocations(config, manualLocations) {
  const remaining = new Set([
    ...config.locationConnections.map((connection) => connection.locationId),
    ...manualLocations.map((location) => location.id)
  ]);
  return StoredSiteConfigSchema.parse({
    ...config,
    manualLocations,
    ...pruneLocationReferences(config, remaining)
  });
}
function storedLocationConnectionsArePublishable(connections) {
  if (connections.length === 0 || connections.filter((connection) => connection.isPrimary).length !== 1) {
    return false;
  }
  const ghlLocationIds = new Set;
  for (const connection of connections) {
    const { ghlLocationId, privateIntegrationToken } = connection.leadRouting;
    const normalizedGhlId = ghlLocationId.trim();
    if (!normalizedGhlId || !privateIntegrationToken.trim())
      return false;
    if (ghlLocationIds.has(normalizedGhlId))
      return false;
    ghlLocationIds.add(normalizedGhlId);
  }
  return true;
}
// src/presets.ts
var capabilities = {
  growth: {
    blog: true,
    commerce: false,
    schedules: false,
    downloads: true,
    memberAuth: false
  },
  scale: {
    blog: true,
    commerce: true,
    schedules: true,
    downloads: true,
    memberAuth: true
  }
};
var colors = {
  growth: {
    primary: "#2563eb",
    background: "#ffffff",
    foreground: "#111827",
    muted: "#64748b",
    accent: "#dbeafe"
  },
  scale: {
    primary: "#008fff",
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#737373",
    accent: "#f0b871"
  }
};
function createSitePreset(input) {
  const isScale = input.preset === "scale";
  return PublicSiteConfigSchema.parse({
    schemaVersion: 2,
    locale: "en-US",
    business: {
      name: input.businessName,
      tagline: input.tagline,
      structuredDataType: "LocalBusiness"
    },
    metadata: {
      defaultTitle: input.businessName,
      titleTemplate: `%s | ${input.businessName}`,
      defaultDescription: input.tagline
    },
    theme: {
      colors: colors[input.preset],
      typography: {
        heading: "sans",
        body: "sans"
      },
      radius: "medium"
    },
    navigation: [
      {
        type: "link",
        id: "home",
        label: "Home",
        href: "/",
        external: false,
        visible: true
      }
    ],
    footer: {
      credit: input.businessName,
      links: []
    },
    content: {
      programs: [],
      teams: [],
      testimonials: [],
      faqs: []
    },
    pages: [
      {
        id: "home",
        path: "/",
        visible: true,
        metadata: {
          title: input.businessName,
          description: input.tagline
        },
        sections: isScale ? [
          {
            id: "home-hero",
            type: "hero",
            visible: true,
            props: {
              title: input.businessName,
              description: input.tagline,
              primaryCta: {
                label: "Get Started",
                href: "#home-start"
              }
            }
          },
          {
            id: "home-about",
            type: "about",
            visible: true,
            props: {
              headline: "Training built around your goals",
              description: [
                `${input.businessName} combines experienced coaching, clear progress, and a welcoming community.`
              ],
              bullets: [
                {
                  title: "Experienced coaching",
                  body: "Learn with clear instruction and practical feedback."
                },
                {
                  title: "Measurable progress",
                  body: "Build skills through a structured path."
                },
                {
                  title: "Supportive community",
                  body: "Train alongside people working toward their own goals."
                }
              ]
            }
          },
          {
            id: "home-benefits",
            type: "three_box",
            visible: true,
            props: {
              title: "Why train with us",
              boxes: [
                {
                  title: "Confidence",
                  description: "Practice skills that carry into everyday life."
                },
                {
                  title: "Fitness",
                  description: "Build strength, coordination, and endurance."
                },
                {
                  title: "Community",
                  description: "Grow with coaches and training partners who care."
                }
              ]
            }
          },
          {
            id: "home-start",
            type: "how_to_start",
            visible: true,
            props: {
              title: "Start in three steps",
              description: "We make it easy to find the right starting point.",
              steps: [
                {
                  title: "Talk with our team",
                  description: "Tell us what you want to accomplish."
                },
                {
                  title: "Visit a class",
                  description: "Meet the coaches and see how training works."
                },
                {
                  title: "Choose your program",
                  description: "Start with a plan that matches your goals."
                }
              ]
            }
          },
          {
            id: "home-cta",
            type: "bottom_cta",
            visible: true,
            props: {
              variant: "box",
              title: "Ready to get started?",
              description: `Take the first step with ${input.businessName}.`,
              cta: {
                label: "Get Started",
                href: "#home-start"
              }
            }
          }
        ] : [
          {
            id: "home-hero",
            type: "hero",
            visible: true,
            props: {
              title: input.businessName,
              description: input.tagline
            }
          },
          {
            id: "home-introduction",
            type: "rich_text",
            visible: true,
            props: {
              title: "Built for your next step",
              body: [
                "Explore programs, resources, and ways to get started."
              ]
            }
          }
        ]
      },
      {
        kind: "builtin",
        id: "schedules",
        path: "/schedules",
        visible: capabilities[input.preset].schedules,
        metadata: {
          title: "Class Schedule",
          description: `View upcoming classes at ${input.businessName}.`
        }
      },
      {
        kind: "builtin",
        id: "blog",
        path: "/blog",
        visible: capabilities[input.preset].blog,
        metadata: {
          title: "Our Blog",
          description: `Read the latest news from ${input.businessName}.`
        }
      },
      {
        kind: "builtin",
        id: "download",
        path: "/download",
        visible: capabilities[input.preset].downloads,
        metadata: {
          title: "Download",
          description: "Download the Monstro app."
        }
      },
      {
        kind: "builtin",
        id: "shop",
        path: "/shop",
        visible: capabilities[input.preset].commerce,
        metadata: {
          title: "Shop",
          description: `Shop gear and plans from ${input.businessName}.`
        }
      },
      {
        kind: "builtin",
        id: "shop-plans",
        path: "/shop/plans",
        visible: capabilities[input.preset].commerce,
        metadata: {
          title: "Membership Plans",
          description: `Browse membership plans from ${input.businessName}.`
        }
      }
    ],
    forms: [],
    capabilities: capabilities[input.preset]
  });
}

// src/legacy/values.ts
var RETIRED_STARTER_KIT_COPY = new Map([
  ["Download Starter Kit", "Get Started"],
  ["If you are looking for the best Martial Arts School in Round Rock, then look no further. Download our starter kit today to get access to our exclusive offer!", "Explore our programs and find the right way to get started."],
  ["Download our free starter kit", "Talk with our team"],
  ["Download and get access to our starter kit, pricing, schedules, and tour details.", "Tell us what you want to accomplish, and we\u2019ll help you choose the right program."],
  ["Download our free starter kit to explore our programs and find the right fit for you.", "Tell us what you want to accomplish, and we\u2019ll help you choose the right program."],
  ["More Confidence. More Focus. Shed Weight Download Our Free Starter Kit Today.", "Ready to get started?"],
  ["More Confidence. More Focus. Shed Weight. Download Our Free Starter Kit Today.", "Ready to get started?"],
  ["Download and get access to our starter kit which includes details on our program, pricing, schedules, tour of our campus, and special promotions.", "Talk with our team about programs, pricing, schedules, and your first class."],
  ["Claim your starter-kit offer.", "Explore our current programs and offers."],
  ["Your Starter Kit Is On The Way", "Thanks for reaching out"],
  ["Your Starter Kit PDF is on the way to the email address you provided. Make sure to check your spam folder if you don't see it in your inbox.", "Thanks for reaching out. Explore this special offer while our team follows up."]
]);
function contentSlug(value, fallback) {
  const slug = `${typeof value === "string" && value.trim() ? value : fallback ?? ""}`.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "program";
}
function pagePath(draft, pageId) {
  const pages = draft.pages;
  const page = pages?.[pageId];
  return typeof page?.path === "string" ? page.path : `/${pageId}`;
}
function normalizeArray(value, draft, preserveStarterKit) {
  return value.flatMap((item) => {
    const normalized = normalizeValue(item, draft, preserveStarterKit);
    return normalized === undefined ? [] : [normalized];
  });
}
function normalizePageLink(source, pageId, draft, preserveStarterKit) {
  if (pageId === "starter-kit" && !preserveStarterKit)
    return;
  const anchor = typeof source.anchor === "string" ? `#${source.anchor}` : "";
  return {
    label: source.label,
    href: `${pagePath(draft, pageId)}${anchor}`,
    external: false,
    variant: source.variant === "outline" ? "secondary" : "primary"
  };
}
function normalizeRecord(source, draft, preserveStarterKit) {
  const normalized = {};
  for (const [key, item] of Object.entries(source)) {
    const next = normalizeValue(item, draft, preserveStarterKit);
    if (next !== undefined)
      normalized[key] = next;
  }
  if (normalized.variant === "default")
    normalized.variant = "primary";
  if (normalized.variant === "outline")
    normalized.variant = "secondary";
  return normalized;
}
function normalizeValue(value, draft, preserveStarterKit = false) {
  if (value === null || value === undefined)
    return;
  if (typeof value === "string") {
    return preserveStarterKit ? value : RETIRED_STARTER_KIT_COPY.get(value) ?? value;
  }
  if (Array.isArray(value))
    return normalizeArray(value, draft, preserveStarterKit);
  if (typeof value !== "object")
    return value;
  const source = value;
  if (typeof source.src === "string" && typeof source.alt === "string") {
    const image = SiteImageSchema.safeParse(source);
    return image.success ? image.data : undefined;
  }
  if (typeof source.label === "string" && typeof source.pageId === "string") {
    return normalizePageLink(source, source.pageId, draft, preserveStarterKit);
  }
  return normalizeRecord(source, draft, preserveStarterKit);
}

// src/legacy/content.ts
function programs2(value) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return [];
    const candidate = item;
    candidate.slug = contentSlug(candidate.slug, candidate.name ?? candidate.id);
    const parsed = SiteProgramSchema.safeParse(candidate);
    if (parsed.success)
      return [parsed.data];
    if (candidate.showLearnMore !== false)
      return [];
    const { detail: _invalidDetail, ...withoutDetail } = candidate;
    const withoutDetailParsed = SiteProgramSchema.safeParse(withoutDetail);
    return withoutDetailParsed.success ? [withoutDetailParsed.data] : [];
  });
}
function validItems(value, schema) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
function content(value, preserveStarterKit) {
  const source = normalizeValue(value, {}, preserveStarterKit) ?? {};
  return {
    programs: programs2(source.programs),
    teams: validItems(source.teams, SiteTeamMemberSchema),
    testimonials: validItems(source.testimonials, SiteTestimonialSchema),
    faqs: validItems(source.faqs, SiteFaqSchema)
  };
}

// src/legacy/forms.ts
function nativeForms(draft, preserveStarterKit) {
  const legacyEditor = draft.legacyEditor;
  const source = Array.isArray(legacyEditor?.forms) ? legacyEditor.forms : draft.forms;
  if (!Array.isArray(source))
    return [];
  return source.flatMap((form2) => {
    if (!preserveStarterKit && form2?.id === "starter-kit-form")
      return [];
    const parsed = NativeSiteFormSchema.safeParse(form2);
    return parsed.success ? [parsed.data] : [];
  });
}
function fixedPageForm(draft, key) {
  const fixedPageForms = draft.fixedPageForms;
  const assignment = fixedPageForms?.[key];
  const globals = draft.globals;
  const legacyStarterKit = key === "starterKit" ? globals?.starterKit : null;
  const formId = typeof assignment?.formId === "string" ? assignment.formId : typeof legacyStarterKit?.formId === "string" ? legacyStarterKit.formId : key === "starterKit" ? "starter-kit-form" : null;
  return formId ? { kind: "native", formId } : null;
}

// src/legacy/location.ts
function legacyAddress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return;
  const address = value;
  const streetAddress = [address.line1, address.line2].filter((part) => typeof part === "string" && part.trim().length > 0).join(", ");
  return {
    ...streetAddress ? { streetAddress } : {},
    ...typeof address.city === "string" ? { addressLocality: address.city } : {},
    ...typeof address.state === "string" ? { addressRegion: address.state } : {},
    ...typeof address.zip === "string" ? { postalCode: address.zip } : {},
    ...typeof address.country === "string" ? { addressCountry: address.country } : {}
  };
}
function legacyLocationOverride(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return;
  const location = value;
  const address = legacyAddress(location.address);
  const candidate = {
    ...typeof location.displayName === "string" ? { name: location.displayName } : typeof location.name === "string" ? { name: location.name } : {},
    ...typeof location.mapQuery === "string" ? { mapQuery: location.mapQuery } : {},
    ...address && Object.keys(address).length > 0 ? { address } : {},
    ...typeof location.phone === "string" ? { phone: location.phone } : {},
    ...typeof location.email === "string" ? { email: location.email } : {},
    ...typeof location.officeHours === "string" ? { hoursDescription: location.officeHours } : {}
  };
  const parsed = SiteLocationOverrideSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

// src/legacy/navigation.ts
function programGroup(source, siteContent) {
  const candidate = {
    type: "group",
    id: typeof source.id === "string" ? source.id : "programs",
    label: typeof source.label === "string" ? source.label : "Programs",
    visible: source.visible !== false,
    items: siteContent.programs.filter((program) => program.visible && program.showLearnMore).map((program) => ({
      type: "link",
      id: `program-${program.id}`,
      label: program.name,
      href: `/programs/${program.slug}`,
      external: false,
      visible: true
    }))
  };
  const parsed = NavigationItemSchema.safeParse(candidate);
  return parsed.success ? [parsed.data] : [];
}
function navigationCandidate(source, draft, siteContent, preserveStarterKit) {
  const href = typeof source.href === "string" ? source.href : typeof source.pageId === "string" ? pagePath(draft, source.pageId) : "/";
  if (source.type === "group") {
    return {
      type: "group",
      id: source.id,
      label: source.label,
      visible: source.visible ?? true,
      items: navigation(source.items, draft, siteContent, preserveStarterKit)
    };
  }
  return {
    type: "link",
    id: source.id,
    label: source.label,
    href: `${href}${typeof source.anchor === "string" ? `#${source.anchor}` : ""}`,
    external: source.external === true || href.startsWith("https://"),
    visible: source.visible ?? true
  };
}
function mapNavigationItem(item, draft, siteContent, preserveStarterKit) {
  if (!item || typeof item !== "object" || Array.isArray(item))
    return [];
  const source = item;
  if (!preserveStarterKit && (source.pageId === "starter-kit" || source.href === "/starter-kit")) {
    return [];
  }
  if (source.type === "collection" && source.collection === "programs") {
    return programGroup(source, siteContent);
  }
  if (source.type === "collection")
    return [];
  const parsed = NavigationItemSchema.safeParse(navigationCandidate(source, draft, siteContent, preserveStarterKit));
  return parsed.success ? [parsed.data] : [];
}
function navigation(value, draft, siteContent, preserveStarterKit) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => mapNavigationItem(item, draft, siteContent, preserveStarterKit));
}

// src/legacy/builtin-pages.ts
function gfoVideo(props) {
  const configured = typeof props.videoSrc === "string" ? props.videoSrc.trim() : "";
  const source = /^[A-Za-z0-9_-]{11}$/.test(configured) ? `https://www.youtube-nocookie.com/embed/${configured}` : configured;
  const src = source ? toVideoEmbedUrl(source) : null;
  if (!src)
    return {};
  return {
    video: {
      src,
      title: typeof props.videoTitle === "string" && props.videoTitle.trim() ? props.videoTitle : "GFO promotional video"
    }
  };
}
function gfoSections(source, draft, preserveStarterKit, title, description) {
  const props = normalizeValue(source.props, draft, preserveStarterKit) ?? {};
  const configuredHref = typeof props.claimOfferHref === "string" ? props.claimOfferHref : "/get-started";
  const href = SiteHrefSchema.safeParse(configuredHref).success ? configuredHref : "/get-started";
  return [
    {
      id: "gfo-offer",
      type: "gfo_offer",
      visible: true,
      props: {
        notice: typeof props.notice === "string" && props.notice.trim() ? props.notice : "Thanks for reaching out. Explore this special offer while our team follows up.",
        title: typeof props.title === "string" && props.title.trim() ? props.title : title,
        description: typeof props.description === "string" && props.description.trim() ? props.description : description,
        ...gfoVideo(props),
        countdownDays: 30,
        cta: {
          label: typeof props.claimOfferLabel === "string" && props.claimOfferLabel.trim() ? props.claimOfferLabel : "Claim Offer",
          href,
          external: href.startsWith("https://"),
          variant: "primary"
        }
      }
    },
    {
      id: "gfo-testimonials",
      type: "testimonials",
      visible: true,
      props: {
        title: "Why families choose us",
        description: "Hear from students and families in our community.",
        source: "all-visible"
      }
    }
  ];
}
function contactSections(draft) {
  const source = fixedPageForm(draft, "contact");
  if (!source)
    return [];
  const business = draft.business;
  const location = draft.location;
  const businessName = typeof business?.name === "string" ? business.name : "us";
  return [{
    id: "contact-form",
    type: "contact_form_section",
    visible: true,
    props: {
      eyebrow: "Got a Question?",
      title: `Contact ${businessName}`,
      description: "We\u2019re here to help and answer any question you might have. We look forward to hearing from you.",
      source,
      helpTitle: "How can we help you today?",
      helpDescription: "Your feedback is important to us\u2014please let us know how we can help. Submit the form on this page and we will get back to you within 48 business hours.",
      locationsTitle: "Our Locations",
      hiddenLocationIds: [],
      hoursTitle: "Our hours",
      hoursDescription: typeof location?.officeHours === "string" ? location.officeHours : "We are open Monday through Friday from 9:00 AM to 5:00 PM."
    }
  }];
}
function pricingSections(id2, draft, form2) {
  const source = fixedPageForm(draft, form2);
  if (!source)
    return [];
  return [{
    id: `${id2}-form`,
    type: "pricing_form_section",
    visible: true,
    props: {
      eyebrow: "Looking For Our Pricing?",
      title: "Tell us what program you\u2019re looking for below",
      description: "Fill out the form below, and one of our coaches will send you our pricing, class schedule, and exclusive promo information for our classes.",
      source
    }
  }];
}
function builtinPageSections(id2, source, draft, preserveStarterKit, title, description) {
  if (id2 === "gfo") {
    return gfoSections(source, draft, preserveStarterKit, title, description);
  }
  if (id2 === "contact")
    return contactSections(draft);
  if (id2 === "pricing")
    return pricingSections(id2, draft, "pricing");
  if (id2 === "get-started")
    return pricingSections(id2, draft, "getStarted");
  if (id2 === "starter-kit")
    return pricingSections(id2, draft, "starterKit");
  return [{
    id: `${id2}-content`,
    type: "rich_text",
    visible: true,
    props: { title, body: [description] }
  }];
}

// src/legacy/sections.ts
var LEGACY_MEDIA_SECTION_TYPES = new Set([
  "hero",
  "about",
  "programs",
  "gallery",
  "team",
  "testimonials",
  "top_review",
  "bottom_cta",
  "pricing_form_section",
  "program_detail"
]);
var IMAGE_FITS = {
  "object-cover": "cover",
  "object-contain": "contain",
  "object-fill": "fill"
};
var IMAGE_POSITIONS = {
  "object-center": "center",
  "object-top": "top",
  "object-bottom": "bottom",
  "object-left": "left",
  "object-right": "right"
};
function defaultCta(draft, preserveStarterKit) {
  const globals = draft.globals;
  const ctas = globals?.ctas;
  const primary = ctas?.primary;
  return normalizeValue(primary, draft, preserveStarterKit) ?? {
    label: "Get Started",
    href: pagePath(draft, "get-started"),
    external: false,
    variant: "primary"
  };
}
function normalizeFormSource(type, props) {
  const isForm = type === "form" || type === "contact_form_section" || type === "pricing_form_section";
  if (!isForm || typeof props.formId !== "string")
    return;
  props.source = { kind: "native", formId: props.formId };
  delete props.formId;
}
function normalizeIframePolicy(type, props) {
  if (type !== "text_iframe" || typeof props.src !== "string")
    return;
  if (typeof props.policy === "string")
    return;
  props.policy = ["video", "form", "scheduler", "map"].find((policy) => isIframeUrlAllowed(props.src, policy));
}
function normalizeNotSureCta(type, props, draft, preserveStarterKit) {
  if (type !== "not_sure" || props.cta !== null && typeof props.cta === "object" && !Array.isArray(props.cta))
    return;
  props.cta = {
    ...defaultCta(draft, preserveStarterKit),
    ...typeof props.buttonLabel === "string" ? { label: props.buttonLabel } : {}
  };
  delete props.buttonLabel;
}
function normalizeBottomCta(type, props, draft, preserveStarterKit) {
  if (type !== "bottom_cta" || props.cta !== null && typeof props.cta === "object" && !Array.isArray(props.cta))
    return;
  const hasText = [props.title, props.description].some((value) => typeof value === "string" && value.trim());
  if (hasText || props.image !== null && typeof props.image === "object" && !Array.isArray(props.image)) {
    props.cta = defaultCta(draft, preserveStarterKit);
  }
}
function sectionProps(source, draft, preserveStarterKit) {
  const props = normalizeValue(source.props, draft, preserveStarterKit) ?? {};
  normalizeFormSource(source.type, props);
  normalizeIframePolicy(source.type, props);
  normalizeNotSureCta(source.type, props, draft, preserveStarterKit);
  normalizeBottomCta(source.type, props, draft, preserveStarterKit);
  return props;
}
function legacySectionPresentation(source) {
  if (typeof source.type !== "string")
    return;
  if (!LEGACY_MEDIA_SECTION_TYPES.has(source.type))
    return;
  const classOverrides = source.classOverrides;
  const media = classOverrides?.media;
  if (typeof media !== "string")
    return;
  let imageFit;
  let imagePosition;
  for (const token of media.split(/\s+/)) {
    imageFit = IMAGE_FITS[token] ?? imageFit;
    imagePosition = IMAGE_POSITIONS[token] ?? imagePosition;
  }
  if (!imageFit && !imagePosition)
    return;
  return {
    ...imageFit ? { imageFit } : {},
    ...imagePosition ? { imagePosition } : {}
  };
}
function parseSection(source, draft, preserveStarterKit) {
  const presentation = legacySectionPresentation(source);
  const parsed = SiteSectionSchema.safeParse({
    id: source.id,
    type: source.type,
    visible: source.visible ?? true,
    ...typeof source.anchor === "string" ? { anchor: source.anchor } : {},
    ...presentation ? { presentation } : {},
    props: sectionProps(source, draft, preserveStarterKit)
  });
  return parsed.success ? [parsed.data] : [];
}
function growthBottomCta(source, draft) {
  if (source.id !== "home-bottom-cta" || source.type !== "bottom_cta")
    return null;
  const formSource = fixedPageForm(draft, "pricing");
  if (!formSource)
    return [];
  const parsed = SiteSectionSchema.safeParse({
    id: source.id,
    type: "bottom_cta_form",
    visible: source.visible ?? true,
    ...typeof source.anchor === "string" ? { anchor: source.anchor } : {},
    props: { source: formSource }
  });
  return parsed.success ? [parsed.data] : [];
}
function mapSection(item, draft, preset, preserveStarterKit) {
  if (!item || typeof item !== "object" || Array.isArray(item))
    return [];
  const source = item;
  const growthSection = preset === "growth" ? growthBottomCta(source, draft) : null;
  return growthSection ?? parseSection(source, draft, preserveStarterKit);
}
function sections(value, draft, preset, preserveStarterKit) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => mapSection(item, draft, preset, preserveStarterKit));
}

// src/legacy/pages.ts
var NATIVE_PAGE_IDS = new Set([
  "home",
  "schedules",
  "blog",
  "download",
  "shop",
  "shop-plans"
]);
function legacyPageMetadata(value, fallbackTitle) {
  const metadata = value;
  const openGraphImage = SiteImageSchema.safeParse(metadata?.openGraphImage ?? metadata?.image);
  return {
    title: typeof metadata?.title === "string" ? metadata.title : fallbackTitle,
    ...typeof metadata?.description === "string" ? { description: metadata.description } : {},
    ...openGraphImage.success ? { openGraphImage: openGraphImage.data } : {}
  };
}
function nativePage(id2, source, path) {
  const parsed = SiteBuiltinPageSchema.safeParse({
    id: id2,
    kind: "builtin",
    path,
    visible: source.visible !== false,
    metadata: legacyPageMetadata(source.metadata, id2)
  });
  return parsed.success ? [parsed.data] : [];
}
function builtinSections(id2, source, draft, preserveStarterKit) {
  const metadata = source.metadata;
  const title = typeof metadata?.title === "string" ? metadata.title : id2;
  const description = typeof metadata?.description === "string" ? metadata.description : `Learn more about ${title}.`;
  return builtinPageSections(id2, source, draft, preserveStarterKit, title, description);
}
function mapStaticPage(id2, item, draft, preset, preserveStarterKit) {
  if (id2 === "starter-kit" && !preserveStarterKit)
    return [];
  if (!item || typeof item !== "object" || Array.isArray(item))
    return [];
  const source = item;
  if (typeof source.path !== "string" || source.path.includes("["))
    return [];
  let pageSections = sections(source.sections, draft, preset, preserveStarterKit);
  const emptyBuiltin = pageSections.length === 0 && source.kind === "builtin";
  if (emptyBuiltin && NATIVE_PAGE_IDS.has(id2))
    return nativePage(id2, source, source.path);
  if (emptyBuiltin) {
    pageSections = builtinSections(id2, source, draft, preserveStarterKit);
  }
  if (pageSections.length === 0)
    return [];
  return [{
    id: id2,
    kind: "sections",
    path: source.path,
    visible: source.visible !== false,
    metadata: legacyPageMetadata(source.metadata, id2),
    sections: pageSections
  }];
}
function staticPages(value, draft, preset, preserveStarterKit) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return [];
  const pages = value;
  return Object.entries(pages).flatMap(([id2, item]) => mapStaticPage(id2, item, draft, preset, preserveStarterKit));
}

// src/legacy/program-pages.ts
function programTemplate(draft) {
  if (!draft.pages || typeof draft.pages !== "object" || Array.isArray(draft.pages)) {
    return null;
  }
  const page = Object.values(draft.pages).find((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return false;
    const path = item.path;
    return path === "/programs/[slug]" || path === "/programs/[programId]";
  });
  return page ?? null;
}
function programSection(item, program, draft, preserveStarterKit) {
  if (!item || typeof item !== "object" || Array.isArray(item))
    return [];
  const source = item;
  const props = sectionProps(source, draft, preserveStarterKit);
  if (source.type === "program_detail")
    props.programId = program.id;
  const presentation = legacySectionPresentation(source);
  const parsed = SiteSectionSchema.safeParse({
    id: source.type === "program_detail" ? `program-${program.slug}-detail` : `program-${program.slug}-${String(source.id)}`,
    type: source.type,
    visible: source.visible ?? true,
    ...typeof source.anchor === "string" ? { anchor: source.anchor } : {},
    ...presentation ? { presentation } : {},
    props
  });
  return parsed.success ? [parsed.data] : [];
}
function programPage(program, templateSections, draft, preserveStarterKit) {
  const mappedSections = templateSections.flatMap((item) => programSection(item, program, draft, preserveStarterKit));
  return {
    id: `program-${program.slug}`,
    kind: "sections",
    path: `/programs/${program.slug}`,
    visible: true,
    metadata: {
      title: program.name,
      description: program.description
    },
    sections: mappedSections.length > 0 ? mappedSections : [{
      id: `program-${program.slug}-detail`,
      type: "program_detail",
      visible: true,
      props: { programId: program.id }
    }]
  };
}
function programPages(siteContent, draft, preserveStarterKit) {
  const template = programTemplate(draft);
  const templateSections = Array.isArray(template?.sections) ? template.sections : [];
  return siteContent.programs.filter((program) => program.visible && program.showLearnMore && program.detail).map((program) => programPage(program, templateSections, draft, preserveStarterKit));
}

// src/legacy/starter-kit.ts
function ensureStarterKitPage(pages, draft, forms) {
  if (pages.some((page) => page.id === "starter-kit" || page.path === "/starter-kit"))
    return;
  const source = fixedPageForm(draft, "starterKit");
  if (!source || !forms.some((form2) => form2.id === source.formId))
    return;
  const legacyPages = draft.pages;
  const legacyPage = legacyPages?.["starter-kit"];
  const metadata = legacyPage?.metadata;
  const title = typeof metadata?.title === "string" ? metadata.title : "Download our free starter kit";
  const description = typeof metadata?.description === "string" ? metadata.description : "Tell us what you are looking for and we will send you the details.";
  pages.push({
    id: "starter-kit",
    kind: "sections",
    path: "/starter-kit",
    visible: legacyPage?.visible !== false,
    metadata: { title, description },
    sections: [{
      id: "starter-kit-form",
      type: "pricing_form_section",
      visible: true,
      props: {
        eyebrow: "Free Starter Kit",
        title,
        description,
        source
      }
    }]
  });
}
function ensureStarterKitHeroLink(pages, draft) {
  const home = pages.find((page) => page.id === "home" && page.kind === "sections");
  const hero2 = home?.sections.find((section) => section.type === "hero");
  if (!hero2 || hero2.type !== "hero" || hero2.props.secondaryCta)
    return;
  const globals = draft.globals;
  const ctas = globals?.ctas;
  const configured = ctas?.starterKit;
  const legacy = configured ?? globals?.starterKit;
  const label = typeof legacy?.label === "string" ? legacy.label : "Download Starter Kit";
  hero2.props.secondaryCta = {
    label,
    href: "/starter-kit",
    external: false,
    variant: "secondary"
  };
}

// src/legacy/conversion.ts
function footerColumns(footer) {
  if (!Array.isArray(footer.columns))
    return [];
  return footer.columns.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return [];
    const column = item;
    const label = typeof column.title === "string" ? column.title : "Explore";
    const common = {
      id: `footer-${contentSlug(label, index)}`,
      label,
      visible: true
    };
    if (column.source === "programs") {
      return [{ type: "collection", collection: "programs", ...common }];
    }
    return [{ type: "group", items: column.items, ...common }];
  });
}
function combinePages(mappedPages, mappedProgramPages, basePages) {
  const staticPaths = new Set(mappedPages.map((page) => page.path));
  const programPaths = new Set(mappedProgramPages.map((page) => page.path));
  return [
    ...mappedPages,
    ...mappedProgramPages.filter((page) => !staticPaths.has(page.path)),
    ...basePages.filter((page) => !staticPaths.has(page.path) && !programPaths.has(page.path))
  ];
}
function configMetadata(metadata, businessName, base) {
  const openGraphImage = SiteImageSchema.safeParse(metadata.openGraphImage);
  return {
    ...base.metadata,
    defaultTitle: typeof metadata.defaultTitle === "string" ? metadata.defaultTitle : businessName,
    titleTemplate: typeof metadata.titleTemplate === "string" ? metadata.titleTemplate : base.metadata.titleTemplate,
    defaultDescription: typeof metadata.defaultDescription === "string" ? metadata.defaultDescription : base.metadata.defaultDescription,
    ...openGraphImage.success ? { openGraphImage: openGraphImage.data } : {}
  };
}
function configTheme(colors2, base) {
  const mappedColors = { ...base.theme.colors };
  for (const key of ["primary", "background", "foreground", "muted", "accent"]) {
    const value = colors2[key];
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
      mappedColors[key] = value;
    }
  }
  return {
    ...base.theme,
    colors: mappedColors
  };
}
function fallbackConfig(candidate, base, mappedPages, mappedProgramPages, locationOverride) {
  const home = mappedPages.find((page) => page.id === "home");
  return PublicSiteConfigSchema.parse({
    ...base,
    ...locationOverride ? { locationOverride } : {},
    business: candidate.business,
    metadata: candidate.metadata,
    theme: candidate.theme,
    content: candidate.content,
    forms: candidate.forms,
    pages: home ? [home, ...mappedProgramPages, ...base.pages.filter((page) => page.path !== "/")] : [...mappedProgramPages, ...base.pages]
  });
}
function legacyDraftToPublicSiteConfig(input, preset, options = {}) {
  const draft = Object(input ?? {});
  const preserveStarterKit = options.starterKit === "preserve";
  const business = draft.business ?? {};
  const metadata = draft.metadata ?? {};
  const theme = draft.theme;
  const colors2 = theme?.colors ?? {};
  const globals = draft.globals ?? {};
  const brand = globals.brand ?? {};
  const footer = globals.footer ?? {};
  const businessName = typeof business.name === "string" ? business.name : "Monstro Site";
  const tagline = typeof business.tagline === "string" ? business.tagline : "Train with confidence.";
  const base = createSitePreset({ preset, businessName, tagline });
  const mappedContent = content(draft.content, preserveStarterKit);
  const mappedPages = staticPages(draft.pages, draft, preset, preserveStarterKit);
  const mappedNavigation = navigation(globals.navigation, draft, mappedContent, preserveStarterKit);
  const mappedForms = nativeForms(draft, preserveStarterKit);
  const mappedFooterLinks = navigation(footerColumns(footer), draft, mappedContent, preserveStarterKit);
  const mappedProgramPages = programPages(mappedContent, draft, preserveStarterKit);
  const logo = SiteImageSchema.safeParse(normalizeValue(brand.logo, draft, preserveStarterKit));
  const configuredLocation = SiteLocationOverrideSchema.safeParse(draft.locationOverride);
  const locationOverride = configuredLocation.success ? configuredLocation.data : legacyLocationOverride(draft.location);
  const candidatePages = combinePages(mappedPages, mappedProgramPages, base.pages);
  if (preserveStarterKit) {
    ensureStarterKitPage(candidatePages, draft, mappedForms);
    ensureStarterKitHeroLink(candidatePages, draft);
  }
  const candidate = {
    ...base,
    ...locationOverride ? { locationOverride } : {},
    business: {
      ...base.business,
      name: businessName,
      tagline,
      ...logo.success ? { logo: logo.data } : {}
    },
    metadata: configMetadata(metadata, businessName, base),
    theme: configTheme(colors2, base),
    navigation: mappedNavigation.length > 0 ? mappedNavigation : base.navigation,
    footer: {
      credit: typeof footer.credit === "string" ? footer.credit : base.footer.credit,
      links: mappedFooterLinks
    },
    content: mappedContent,
    forms: mappedForms,
    pages: candidatePages
  };
  const parsed = PublicSiteConfigSchema.safeParse(candidate);
  if (parsed.success)
    return parsed.data;
  return fallbackConfig(candidate, base, mappedPages, mappedProgramPages, locationOverride);
}
// src/legacy/stored.ts
var SHARED_CONFIG_KEYS = [
  "schemaVersion",
  "locale",
  "business",
  "metadata",
  "theme",
  "navigation",
  "footer",
  "headerAction",
  "locationConnections",
  "locationOverride",
  "content",
  "pages",
  "forms",
  "capabilities",
  "scriptsAndEmbeds"
];
function migrateDownloadPage(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return input;
  const source = input;
  if (!Array.isArray(source.pages))
    return input;
  const index = source.pages.findIndex((item2) => {
    if (!item2 || typeof item2 !== "object" || Array.isArray(item2))
      return false;
    const page2 = item2;
    return page2.id === "download" && page2.path === "/download" && page2.kind !== "builtin";
  });
  if (index === -1)
    return input;
  const item = source.pages[index];
  if (!item || typeof item !== "object" || Array.isArray(item))
    return input;
  const page = item;
  const pages = source.pages.slice();
  pages[index] = {
    id: "download",
    kind: "builtin",
    path: "/download",
    visible: page.visible !== false,
    metadata: page.metadata
  };
  return { ...source, pages };
}
function sharedConfig(source) {
  const migratedLocation = !("locationOverride" in source) ? legacyLocationOverride(source.location) : undefined;
  const values = SHARED_CONFIG_KEYS.flatMap((key) => (key in source) ? [[key, source[key]]] : []);
  const candidate = {
    ...Object.fromEntries(values),
    ...migratedLocation ? { locationOverride: migratedLocation } : {}
  };
  const parsed = PublicSiteConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
function publicSiteConfigFromStored(input, preset, options = {}) {
  const normalized = normalizeSiteConfigV2(migrateDownloadPage(input));
  const parsed = PublicSiteConfigSchema.safeParse(normalized);
  if (parsed.success)
    return parsed.data;
  const shared = normalized && typeof normalized === "object" && !Array.isArray(normalized) ? sharedConfig(normalized) : null;
  return shared ?? legacyDraftToPublicSiteConfig(normalized, preset, options);
}
// src/live-data.ts
import { z as z36 } from "zod";
var JsonValueSchema = z36.lazy(() => z36.union([
  z36.string(),
  z36.number(),
  z36.boolean(),
  z36.null(),
  z36.array(JsonValueSchema),
  z36.record(z36.string(), JsonValueSchema)
]));
var SiteDateSchema = z36.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Date must be a valid calendar date");
var LocationListSchema = z36.string().min(1).transform((value) => value.split(",").map((item) => item.trim())).pipe(z36.array(SiteLocationSlugSchema).min(1));
var ScheduleQuerySchema = z36.object({
  date: SiteDateSchema,
  location: SiteLocationSlugSchema.optional(),
  locations: LocationListSchema.optional()
}).strict();
var PlansQuerySchema = z36.object({
  location: SiteLocationSlugSchema.optional(),
  locations: LocationListSchema.optional()
}).strict();
var DocumentSignatureRequestSchema = z36.object({ signature: z36.string().min(1) }).strict();
var EnrollRequestSchema = z36.object({
  locationId: z36.string().min(1).optional(),
  attemptId: z36.string().min(1),
  priceId: z36.string().min(1),
  planType: z36.enum(["recurring", "one-time"]).optional(),
  paymentType: z36.string().min(1),
  paymentMethodId: z36.string().min(1),
  promoId: z36.string().min(1).nullable().optional()
}).strict();
var EnrollQuoteRequestSchema = z36.object({
  priceId: z36.string().min(1),
  planType: z36.enum(["recurring", "one-time"]),
  paymentType: z36.enum(["card", "us_bank_account"]),
  promoId: z36.string().min(1).nullable().optional()
}).strict();
var PaymentAddressSchema = z36.object({
  line1: z36.string(),
  line2: z36.string().optional(),
  city: z36.string(),
  state: z36.string(),
  postalCode: z36.string(),
  country: z36.string()
}).strict();
var EnrollResponseSchema = z36.object({
  ok: z36.literal(true),
  unsignedDocs: z36.array(z36.string().min(1))
}).strict();
var CheckoutAdditionalFeeSchema = z36.object({
  label: z36.string().min(1),
  amount: z36.number().int().nonnegative(),
  description: z36.string().min(1).optional()
}).strict();
var EnrollQuoteSchema = z36.object({
  baseAmount: z36.number().int().nonnegative(),
  discount: z36.number().int().nonnegative(),
  tax: z36.number().int().nonnegative(),
  fees: z36.number().int().nonnegative(),
  additionalFees: z36.array(CheckoutAdditionalFeeSchema).default([]),
  total: z36.number().int().nonnegative(),
  currency: z36.string().min(1)
}).strict();
var ShopCheckoutQuoteSchema = z36.object({
  subtotal: z36.number().int().nonnegative(),
  discount: z36.number().int().nonnegative(),
  tax: z36.number().int().nonnegative(),
  feesAmount: z36.number().int().nonnegative(),
  processingFee: z36.number().int().nonnegative(),
  additionalFees: z36.array(CheckoutAdditionalFeeSchema).default([]),
  total: z36.number().int().nonnegative()
}).strict();
var PaymentMethodSchema = z36.discriminatedUnion("type", [
  z36.object({
    id: z36.string().min(1),
    source: z36.enum(["stripe", "square", "authorize"]),
    type: z36.literal("card"),
    isDefault: z36.boolean(),
    address: PaymentAddressSchema.optional(),
    card: z36.object({
      brand: z36.string().min(1),
      last4: z36.string().nullable().optional(),
      expMonth: z36.number().nullable(),
      expYear: z36.number().nullable()
    }).strict()
  }).strict(),
  z36.object({
    id: z36.string().min(1),
    source: z36.enum(["stripe", "square", "authorize"]),
    type: z36.literal("us_bank_account"),
    isDefault: z36.boolean(),
    usBankAccount: z36.object({
      bankName: z36.string().nullable(),
      last4: z36.string().nullable(),
      accountType: z36.string().nullable()
    }).strict()
  }).strict()
]);
var PaymentMethodsApiResponseSchema = z36.array(PaymentMethodSchema);
var ScheduleSessionSchema = z36.object({
  id: z36.string().min(1),
  name: z36.string(),
  minAge: z36.number(),
  maxAge: z36.number(),
  utcStartTime: z36.string().datetime(),
  utcEndTime: z36.string().datetime(),
  day: z36.string().datetime(),
  isHoliday: z36.boolean(),
  isBlocked: z36.boolean(),
  holidayName: z36.string().optional(),
  description: z36.string()
}).strict();
var ScheduleApiResponseSchema = z36.object({ sessions: z36.array(ScheduleSessionSchema) }).strict();
var PlanProgramSchema = z36.object({
  id: z36.string().min(1),
  name: z36.string(),
  minAge: z36.number(),
  maxAge: z36.number(),
  icon: z36.string().nullable().optional(),
  description: z36.string().nullable()
}).strict();
var PlanPricingSchema = z36.object({
  id: z36.string().min(1),
  memberPlanId: z36.string().min(1),
  name: z36.string(),
  price: z36.number(),
  interval: z36.string().nullable().optional(),
  intervalThreshold: z36.number().nullable().optional(),
  expireInterval: z36.string().nullable().optional(),
  expireThreshold: z36.number().nullable().optional(),
  downpayment: z36.number().nullable().optional(),
  created: z36.string().datetime().optional(),
  updated: z36.string().datetime().nullable().optional()
}).strict();
var SitePlanSchema = z36.object({
  id: z36.string().min(1),
  name: z36.string(),
  description: z36.string().nullable(),
  family: z36.boolean(),
  familyMemberLimit: z36.number(),
  editable: z36.boolean(),
  archived: z36.boolean(),
  contractId: z36.string().nullable(),
  billingAnchorConfig: JsonValueSchema,
  marketingDetails: JsonValueSchema,
  type: z36.enum(["one-time", "recurring"]),
  totalClassLimit: z36.number().nullable(),
  classLimitInterval: z36.string().nullable(),
  allowProration: z36.boolean(),
  classLimitThreshold: z36.number().nullable(),
  makeUpCredits: z36.number(),
  groupId: z36.string().nullable(),
  locationId: z36.string(),
  created: z36.string().datetime(),
  updated: z36.string().datetime().nullable(),
  programs: z36.array(PlanProgramSchema),
  startingPrice: z36.number(),
  pricings: z36.array(PlanPricingSchema),
  ageRange: z36.object({ min: z36.number(), max: z36.number() }).strict()
}).strict();
var PlanContractSchema = z36.object({
  id: z36.string().min(1),
  title: z36.string(),
  requireSignature: z36.boolean()
}).strict();
var ApiPlanProgramSchema = PlanProgramSchema.extend({
  capacity: z36.number()
}).strict();
var ApiSitePlanSchema = SitePlanSchema.extend({
  contract: PlanContractSchema.nullable(),
  programs: z36.array(ApiPlanProgramSchema)
}).strict().transform(({ contract: _contract, programs: programs3, ...plan }) => ({
  ...plan,
  programs: programs3.map(({ capacity: _capacity, ...program }) => program)
}));
var PlansApiResponseSchema = z36.array(ApiSitePlanSchema);
var BlogPostSummarySchema = z36.object({
  id: z36.string().min(1),
  title: z36.string().min(1),
  slug: z36.string().min(1),
  featuredImageUrl: z36.string().nullable(),
  publishedAt: z36.string().datetime().nullable(),
  updatedAt: z36.string().datetime().nullable()
}).strict();
var BlogPostSchema = BlogPostSummarySchema.extend({
  mdx: z36.string(),
  metaTitle: z36.string().nullable(),
  metaDescription: z36.string().nullable(),
  authorName: z36.string().min(1).nullable()
}).strict();
var BlogPostsApiResponseSchema = z36.object({
  posts: z36.array(BlogPostSummarySchema),
  total: z36.number().int().nonnegative()
}).strict();
var ProductVariantSchema = z36.object({
  id: z36.string().min(1),
  productId: z36.string().min(1),
  name: z36.string().min(1),
  sku: z36.string().min(1),
  color: z36.string().nullable(),
  size: z36.string().nullable(),
  price: z36.number().int().nonnegative(),
  salePrice: z36.number().int().nonnegative().nullable(),
  stock: z36.number().int(),
  active: z36.boolean()
}).strict();
var ProductImageSchema = z36.object({
  id: z36.string().min(1),
  productId: z36.string().min(1),
  imageUrl: z36.string().min(1),
  sortOrder: z36.number().int()
}).strict();
var SiteProductSchema = z36.object({
  id: z36.string().min(1),
  slug: z36.string().min(1),
  name: z36.string().min(1),
  category: z36.string().nullable(),
  subCategory: z36.string().nullable(),
  description: z36.string().nullable(),
  brand: z36.string().nullable(),
  active: z36.boolean(),
  currency: z36.string().length(3).nullable(),
  createdAt: z36.string().datetime(),
  updatedAt: z36.string().datetime().nullable(),
  variants: z36.array(ProductVariantSchema),
  images: z36.array(ProductImageSchema)
}).strict();
var ProductsApiResponseSchema = z36.array(SiteProductSchema);
var LocationFailureSchema = z36.object({
  location: SiteLocationSchema,
  message: z36.string().min(1)
}).strict();
function scheduleQueryKey(siteId, date, locationIds) {
  return ["schedules", siteId, date, ...locationIds];
}
function plansQueryKey(siteId, locationIds) {
  return ["plans", siteId, ...locationIds];
}
// src/navigation.ts
function safeSameOriginPath(value, fallback = "/") {
  if (!value)
    return fallback;
  try {
    const candidate = value;
    const url = new URL(candidate, "https://site.invalid");
    if (url.origin !== "https://site.invalid" || !url.pathname.startsWith("/") || url.pathname.startsWith("//") || /[\u0000-\u001f\\]/.test(candidate)) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
function withLocationSlug(path, slug) {
  const safePath = safeSameOriginPath(path);
  const url = new URL(safePath, "https://site.invalid");
  const parsedSlug = SiteLocationSlugSchema.safeParse(slug);
  if (parsedSlug.success)
    url.searchParams.set("location", parsedSlug.data);
  return `${url.pathname}${url.search}${url.hash}`;
}
// src/section-templates.ts
var SITE_SECTION_TEMPLATES = [
  { key: "hero", type: "hero", name: "Hero", description: "A headline, supporting copy, image, and calls to action." },
  { key: "rich-text", type: "rich_text", name: "Rich Text", description: "A heading with flexible paragraph content." },
  { key: "external-widget", type: "external_widget", name: "External Widget", description: "A managed provider widget configured from validated embed code." },
  { key: "sandboxed-embed", type: "sandboxed_embed", name: "Sandboxed HTML", description: "Third-party HTML and scripts isolated from the site in a sandboxed frame." },
  { key: "about", type: "about", name: "About", description: "Business story, supporting image, and key points." },
  { key: "gallery", type: "gallery", name: "Gallery", description: "A visual gallery with a heading and description." },
  { key: "gfo-page-sections", type: "gfo_offer", name: "GFO Page Sections", description: "The GFO offer header, optional video, countdown, and claim-offer action." },
  { key: "team", type: "team", name: "Team", description: "Visible instructors or team members from site content." },
  { key: "testimonials", type: "testimonials", name: "Testimonials", description: "Visible customer testimonials and social proof." },
  { key: "faqs", type: "faqs", name: "FAQs", description: "Visible frequently asked questions from site content." },
  { key: "bottom-cta", type: "bottom_cta", name: "Bottom CTA", description: "A closing call to action with optional imagery." },
  { key: "three-box", type: "three_box", name: "Three Box", description: "A heading followed by compact feature cards." },
  { key: "compare", type: "compare", name: "Comparison", description: "Side-by-side cards comparing benefits or options." }
];
function getSiteSectionTemplate(key) {
  return SITE_SECTION_TEMPLATES.find((template) => template.key === key);
}
// src/runtime.ts
import { z as z37 } from "zod";
var RuntimeSitePayloadSchema = z37.object({
  context: TenantContextSchema,
  revision: z37.object({
    id: z37.string().min(1).max(128),
    schemaVersion: z37.number().int().positive(),
    config: z37.unknown(),
    publishedAt: z37.string().datetime().nullable()
  }).strict()
}).strict();
function parseRuntimeSite(input) {
  const payload = RuntimeSitePayloadSchema.parse(input);
  const config = publicSiteConfigFromStored(payload.revision.config, payload.context.capabilities.commerce ? "scale" : "growth");
  if (payload.revision.id !== payload.context.publishedRevisionId) {
    throw new Error("Published site revision does not match its runtime context");
  }
  const allowedLocationIds = new Set(payload.context.allowedLocationIds);
  if (config.locationConnections) {
    const configuredIds = config.locationConnections.slice().sort((left, right) => left.displayOrder - right.displayOrder).map((connection) => connection.locationId);
    const configuredPrimary = config.locationConnections.find((connection) => connection.isPrimary);
    if (configuredIds.length !== payload.context.allowedLocationIds.length || configuredIds.some((id2, index) => id2 !== payload.context.allowedLocationIds[index]) || configuredPrimary?.locationId !== payload.context.primaryLocationId) {
      throw new Error("Published location connections are inconsistent");
    }
  }
  for (const page of config.pages) {
    if (page.kind === "builtin")
      continue;
    for (const section of page.sections) {
      if ((section.type === "schedules" || section.type === "plans") && section.props.locationIds.some((id2) => !allowedLocationIds.has(id2))) {
        throw new Error("Published live section references a disallowed location");
      }
      const formPlacement = getNativeFormPlacement(section);
      if (formPlacement?.fixedLocationId && !allowedLocationIds.has(formPlacement.fixedLocationId)) {
        throw new Error("Published form references a disallowed location");
      }
    }
  }
  for (const key of Object.keys(config.capabilities)) {
    if (config.capabilities[key] !== payload.context.capabilities[key]) {
      throw new Error("Published site capabilities are inconsistent");
    }
  }
  return {
    context: resolveRenderedTenantContext(config, payload.context),
    revision: {
      ...payload.revision,
      schemaVersion: config.schemaVersion,
      config
    }
  };
}
var SiteCacheInvalidationSchema = z37.object({
  siteId: z37.string().min(1).max(128),
  revisionId: z37.string().min(1).max(128),
  domains: z37.array(z37.string().min(1).max(253)).min(1).max(100)
}).strict();
// src/stored-config.ts
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function legacyLeadRouting(input, locationId, primary) {
  const integrations = record(record(input)?.integrations);
  const ghl = record(integrations?.ghl);
  const keyed = Array.isArray(ghl?.locations) ? ghl.locations.map(record).find((item) => item?.locationId === locationId) : undefined;
  if (keyed) {
    return {
      ghlLocationId: typeof keyed.ghlLocationId === "string" ? keyed.ghlLocationId : "",
      privateIntegrationToken: typeof keyed.privateIntegrationToken === "string" ? keyed.privateIntegrationToken : ""
    };
  }
  return {
    ghlLocationId: primary && typeof ghl?.locationId === "string" ? ghl.locationId : "",
    privateIntegrationToken: primary && typeof ghl?.privateIntegrationToken === "string" ? ghl.privateIntegrationToken : ""
  };
}
function configuredConnections(config, fallbackConnections) {
  return config.locationConnections?.length ? config.locationConnections : fallbackConnections;
}
function storedSiteConfigFromStored(input, preset, fallbackConnections, options = {}) {
  const current = StoredSiteConfigSchema.safeParse(input);
  if (current.success)
    return current.data;
  const publicConfig = publicSiteConfigFromStored(input, preset, options);
  const connections = configuredConnections(publicConfig, fallbackConnections);
  const storedInput = {
    ...publicConfig,
    schemaVersion: 3,
    locationConnections: connections.map((connection) => ({
      ...connection,
      ...connection.override ? {} : connection.isPrimary && publicConfig.locationOverride ? { override: publicConfig.locationOverride } : {},
      leadRouting: legacyLeadRouting(input, connection.locationId, connection.isPrimary)
    }))
  };
  delete storedInput.locationOverride;
  return StoredSiteConfigSchema.parse(storedInput);
}
export {
  withStoredLocationConnections,
  withManualLocations,
  withLocationSlug,
  validateFormValues,
  toVideoEmbedUrl,
  toPublicSiteConfig,
  toGhlFormContact,
  storedSiteConfigFromStored,
  storedLocationConnectionsArePublishable,
  siteLocationReferences,
  siteCustomEmbedPartsByteLength,
  sectionImageTargetKey,
  scheduleQueryKey,
  safeSameOriginPath,
  resolveSitePageHeader,
  resolveSelectedLocation,
  resolveRenderedTenantContext,
  resolveFormRedirect,
  publicSiteConfigFromStored,
  plansQueryKey,
  parseStoredSiteConfig,
  parseRuntimeSite,
  parsePublicSiteConfig,
  parseGymdeskScheduleSnippet,
  orderedAllowedLocations,
  normalizeStoredLocationConnections,
  normalizeSitePageTemplateV2,
  normalizeSiteConfigV2,
  materializeSitePageTemplate,
  manualLocationForDisplay,
  locationBySlug,
  locationById,
  legacyDraftToPublicSiteConfig,
  isIframeUrlAllowed,
  isFormFieldVisible,
  getSiteSectionTemplate,
  getNativeFormPlacement,
  getFormValidationErrors,
  getFormPlacement,
  formatSiteLocationAddress,
  createSitePreset,
  applySiteLocationOverride,
  TopReviewSectionSchema,
  ThreeBoxSectionSchema,
  TextIframeSectionSchema,
  TestimonialsSectionSchema,
  TenantContextSchema,
  TeamSectionSchema,
  StoredSiteLocationConnectionSchema,
  StoredSiteConfigSchema,
  SiteTikTokPixelEntrySchema,
  SiteThemeSchema,
  SiteTestimonialSchema,
  SiteTeamMemberSchema,
  SiteSectionsPageSchema,
  SiteSectionSchema,
  SiteScriptsAndEmbedsSchema,
  SiteScriptPurposeSchema,
  SiteScriptPlacementSchema,
  SiteScriptEntrySchema,
  SiteSandboxedEmbedEntrySchema,
  SiteProgramSchema,
  SiteProductSchema,
  SitePostalAddressSchema,
  SitePlanSchema,
  SitePageTemplateSchema,
  SitePageSchema,
  SitePageHeaderSchema,
  SiteOpeningHoursSchema,
  SiteMetaPixelEntrySchema,
  SiteManualLocationSchema,
  SiteLocationSlugSchema,
  SiteLocationSchema,
  SiteLocationOverrideSchema,
  SiteLocationLeadRoutingSchema,
  SiteLocationConnectionSchema,
  SiteLinkSchema,
  SiteImageTargetSchema,
  SiteImageSchema,
  SiteHrefSchema,
  SiteHeaderActionSchema,
  SiteGtmEntrySchema,
  SiteGoogleTagEntrySchema,
  SiteFormSchema,
  SiteFaqSchema,
  SiteDateSchema,
  SiteCustomMarkupPartSchema,
  SiteCustomInlineScriptPartSchema,
  SiteCustomExternalScriptPartSchema,
  SiteCustomEmbedPartSchema,
  SiteCustomEmbedEntrySchema,
  SiteContentSchema,
  SiteCapabilitiesSchema,
  SiteCacheInvalidationSchema,
  SiteBuiltinPageSchema,
  SiteAssetSrcSchema,
  ShopCheckoutQuoteSchema,
  SectionPresentationSchema,
  SectionImageTargetSchema,
  SectionImagePositionSchema,
  SectionImageOverrideSchema,
  SectionImageFitSchema,
  SectionIdentifierSchema,
  SectionHeadingSchema,
  SectionBaseSchema,
  SchedulesSectionSchema,
  SchedulesSectionPropsSchema,
  ScheduleSessionSchema,
  ScheduleQuerySchema,
  ScheduleApiResponseSchema,
  SandboxedEmbedSectionSchema,
  SITE_SECTION_TEMPLATES,
  SITE_FOOTER_EDITOR_TARGET_ID,
  RichTextSectionSchema,
  RenderedTenantContextSchema,
  RenderedSiteLocationSchema,
  RedirectRuleSchema,
  REQUIRED_CONSENT_FIELDS,
  PublishableStoredSiteConfigSchema,
  PublicSiteConfigSchema,
  ProgramsSectionSchema,
  ProgramDetailSectionSchema,
  ProductsApiResponseSchema,
  ProductVariantSchema,
  ProductImageSchema,
  PricingFormSectionSchema,
  PlansSectionSchema,
  PlansSectionPropsSchema,
  PlansQuerySchema,
  PlansApiResponseSchema,
  PlanProgramSchema,
  PlanPricingSchema,
  PaymentMethodsApiResponseSchema,
  PaymentMethodSchema,
  OrderedIdsSchema,
  NotSureSectionSchema,
  NavigationItemSchema,
  NativeSiteFormSchema,
  MediaSectionBaseSchema,
  MAX_SITE_SANDBOXED_EMBED_BYTES,
  MAX_SITE_CUSTOM_EMBED_BYTES,
  LocationFailureSchema,
  IframeFormPlacementSchema,
  IframeEmbedSectionSchema,
  HttpsUrlSchema,
  HowToStartSectionSchema,
  HeroSectionSchema,
  GymdeskExternalWidgetSettingsSchema,
  GfoOfferSectionSchema,
  GallerySectionSchema,
  GYMDESK_WIDGET_SCRIPT_URL,
  GLOBAL_SITE_EDITOR_TARGETS,
  FormValuesSchema,
  FormValueSchema,
  FormSubmissionResponseSchema,
  FormSubmissionRequestSchema,
  FormSectionSchema,
  FormPlacementSchema,
  FormFieldSchema,
  FaqsSectionSchema,
  FORM_IFRAME_POLICY,
  ExternalWidgetSectionSchema,
  ExternalWidgetSectionPropsSchema,
  EnrollResponseSchema,
  EnrollRequestSchema,
  EnrollQuoteSchema,
  EnrollQuoteRequestSchema,
  DocumentSignatureRequestSchema,
  ContactFormSectionSchema,
  CompareSectionSchema,
  CheckoutAdditionalFeeSchema,
  BuiltinPageIdSchema,
  BottomCtaSectionSchema,
  BottomCtaFormSectionSchema,
  BlogPostsApiResponseSchema,
  BlogPostSummarySchema,
  BlogPostSchema,
  AboutSectionSchema
};
