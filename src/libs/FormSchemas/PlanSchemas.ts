import { z } from "zod";

// Schema for individual pricing option
const PricingOptionSchema = z.object({
  name: z.string().min(1, { message: "Pricing name is required" }),
  price: z.number().min(100, { message: "Price must be at least $1" }),
  interval: z.enum(["day", "week", "month", "year"]).optional(),
  intervalThreshold: z.number().min(1),
  expireInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  expireThreshold: z.number().optional().nullable(),
  downpayment: z.number().min(0).optional(),
});

const NewPlanSchema = z
  .object({
    type: z.enum(["recurring", "one-time"], { message: "Required" }),
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    pricingOptions: z.array(PricingOptionSchema).min(1, { message: "At least one pricing option is required" }),
    family: z.boolean().optional(),
    familyMemberLimit: z.number().optional(),
    contractId: z.string().optional(),
    intervalClassLimit: z.number().optional(),
    makeUpCredits: z.number().min(0).optional(),
    groupId: z.string().optional(),
    programs: z.array(z.string())
      .min(1, { message: "Select at least one program." }),
    pkg: z.object({
      totalClassLimit: z.number().optional(),
    }),
    sub: z.object({
      allowProration: z.boolean(),
      billingAnchor: z.number().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "one-time") {
      if (!data.pkg.totalClassLimit || data.pkg.totalClassLimit < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["pkg", "totalClassLimit"],
        });
      }
    }
    if (data.family) {
      if (!data.familyMemberLimit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["familyMemberLimit"],
        });
      } else if (data.familyMemberLimit < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least 1 family member.",
          path: ["familyMemberLimit"],
        });
      } else if (data.familyMemberLimit > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max 10 family members",
          path: ["familyMemberLimit"],
        });
      }
    }
    // Validate pricing options based on plan type
    if (data.type === "recurring") {
      for (let i = 0; i < data.pricingOptions.length; i++) {
        const option = data.pricingOptions[i];
        if (!option.interval) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Billing interval is required for subscriptions",
            path: ["pricingOptions", i, "interval"],
          });
        }
      }
    }
  });

const UpdateSubPlanSchema = z
  .object({
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    intervalClassLimit: z.number().optional(),
    groupId: z.string().optional().nullable(),
    programs: z
      .array(z.string())
      .min(1, { message: "Select at least one program." }),
    allowProration: z.boolean().optional(),
    familyMemberLimit: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    // Add validation to ensure family limit can only be increased
    // This will be checked against the current value in the component
    if (data.familyMemberLimit !== undefined && data.familyMemberLimit < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Family member limit must be non-negative",
        path: ["familyMemberLimit"],
      });
    }
  });

const UpdatePkgPlanSchema = z
  .object({
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    groupId: z.string().optional().nullable(),
    programs: z
      .array(z.string())
      .min(1, { message: "Select at least one program." }),
    familyMemberLimit: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    // Add validation to ensure family limit can only be increased
    // This will be checked against the current value in the component
    if (data.familyMemberLimit !== undefined && data.familyMemberLimit < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Family member limit must be non-negative",
        path: ["familyMemberLimit"],
      });
    }
  });

type PresetInterval = {
  label: string;
  interval: string;
  intervalThreshold: number;
};

const PresetIntervals: PresetInterval[] = [
  { label: "Daily", interval: "day", intervalThreshold: 1 },
  { label: "Weekly", interval: "week", intervalThreshold: 1 },
  { label: "Monthly", interval: "month", intervalThreshold: 1 },
  { label: "Yearly", interval: "year", intervalThreshold: 1 },
  { label: "Every 3 Months", interval: "month", intervalThreshold: 3 },
  { label: "Every 6 Months", interval: "month", intervalThreshold: 6 },
  { label: "Custom", interval: "custom", intervalThreshold: 1 },
];

const PlanType: { label: string; description: string; value: string }[] = [
  { label: "Package Plan", description: "All new messages", value: "one-time" },
  {
    label: "Subscription Plan",
    description: "All new messages and mentions",
    value: "recurring",
  },
];

const BillingAnchorConfigSchema = [
  { label: "1st of the month", value: 1 },
  { label: "15th of the month", value: 15 },
];

export {
  BillingAnchorConfigSchema,
  NewPlanSchema,
  PlanType,
  PresetIntervals,
  PricingOptionSchema,
  UpdatePkgPlanSchema,
  UpdateSubPlanSchema,
  type PresetInterval
};

