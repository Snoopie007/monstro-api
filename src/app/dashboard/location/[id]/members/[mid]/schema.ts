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
    memberPlanId: z.string().min(1, "required"),
    startDate: z.date().min(new Date(), "Activation date must be in the future"),
    paymentMethod: z.enum(["card", "cash", "zelle", "bank payment", "cheque"], { message: "required" }),
    other: z.object({
        cardId: z.string().optional(),
    }),
};

export const NewSubscriptionSchema = z.object({
    ...SubsAndPackageFields,
    endDate: z.date().optional(),
    trailDays: z.number().int().optional(),
    allowProration: z.boolean().optional()
}).superRefine((data, ctx) => {
    if (data.paymentMethod === "card" && !data.other.cardId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Card ID is required for card payments",
            path: ["other", "cardId"]
        })
    }
});


export const NewPackageSchema = z.object({
    ...SubsAndPackageFields,
    expireDate: z.date().optional(),
    totalClassLimit: z.number().min(0, "Total class limit must be greater than 0").max(100, "Total class limit must be less than 100").optional(),
}).superRefine((data, ctx) => {
    if (data.paymentMethod === "card" && !data.other.cardId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Card ID is required for card payments",
            path: ["other", "cardId"]
        })
    }
});
export const MemberInfoSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    avatar: z.string().url().optional().or(z.literal("")),
});
export const AddFamilyMemberSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    familyMemberId: z.string(),
    relationship: z.string(),
    parentPlanId: z.string()
})
export const DAYS = [
    { label: "MON", value: 1 },
    { label: "TUE", value: 2 },
    { label: "WED", value: 3 },
    { label: "THU", value: 4 },
    { label: "FRI", value: 5 },
    { label: "SAT", value: 6 },
    { label: "SUN", value: 7 },
    { label: "ALL", value: 8 }
]


