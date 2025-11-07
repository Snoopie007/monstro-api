import { z } from "zod";
import { MemberGeneralInfoSchema } from "../schema";

export const UpdateMemberSchema = z.object({
    currentPoints: z.number().int().min(0, 'Current points must be a positive number'),
    reedemPoints: z.number().int().min(0, 'Reedem points must be a positive number'),
}).merge(MemberGeneralInfoSchema);


export const ChargeItemSchema = z.object({
    amount: z.number().min(1, "Amount is required"),
    paymentType: z.enum(["card", "cash", "us_bank_account", "paypal", "apple_pay", "google_pay"], { message: "required" }),
    description: z.string().optional(),
    item: z.string().min(1, "Item is required"),
    paymentMethodId: z.string().optional(),
    chargeDate: z.date().optional(),
})

// Common fields shared between subscription and package schemas
const CommonFields = z.object({
    memberPlanId: z.string().min(1, "required"),
    startDate: z.date().min(new Date(), "Activation date must be in the future"),
})

export const NewSubscriptionSchema = z.object({
    endDate: z.date().optional(),
    trailDays: z.number().int().optional(),
    allowProration: z.boolean().optional()
}).merge(CommonFields)

export const NewPackageSchema = z.object({
    expireDate: z.date().optional(),
    totalClassLimit: z.number().min(0, "Total class limit must be greater than 0").max(100, "Total class limit must be less than 100").optional(),
}).merge(CommonFields)


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


