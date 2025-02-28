import { z } from "zod";
import { MemberGeneralInfoSchema } from "../schema";

export const UpdateMemberSchema = z.object({
    currentPoints: z.number().int().min(0, 'Current points must be a positive number'),
    reedemPoints: z.number().int().min(0, 'Reedem points must be a positive number'),
}).merge(MemberGeneralInfoSchema);


export const ChargeItemSchema = z.object({
    amount: z.number().min(1, "Amount is required"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    description: z.string().optional(),
    item: z.string().min(1, "Item is required"),
    cardId: z.string().optional(),
    chargeDate: z.date().optional(),
})

// Common fields shared between subscription and package schemas
const SubsAndPackageFields = {
    programId: z.number().min(1, "Program is required"),
    memberPlanId: z.number().min(1, "Plan is required"),
    startDate: z.date().min(new Date(), "Activation date must be in the future"),
    paymentType: z.enum(["card", "cash", "zelle", "bank payment", "cheque"], { message: "Payment type is required" }),
    cardId: z.string().optional(),
};

export const NewSubscriptionSchema = z.object({
    ...SubsAndPackageFields,
    endDate: z.date().optional(),
    trail: z.number().int().optional(),
    billingAnchor: z.enum(["1st", "15th", "last of month"]).optional(),
    allowProration: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentType === "card" && !data.cardId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Card ID is required for card payments",
            path: ["cardId"]
        })
    }
});


export const NewPackageSchema = z.object({
    ...SubsAndPackageFields,
    expireDate: z.date().optional(),
    totalClassLimit: z.number().min(0, "Total class limit must be greater than 0").max(100, "Total class limit must be less than 100").optional(),
}).superRefine((data, ctx) => {
    if (data.paymentType === "card" && !data.cardId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Card ID is required for card payments",
            path: ["cardId"]
        })
    }
});

export const AddChildMemberSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    family: z.object({
        planId: z.number().optional(),
        existingPlanId: z.number().optional(),
        programId: z.number().optional(),
        relationship: z.string(),
    }),
})
