import { z } from "zod";
import { MemberGeneralInfoSchema } from "../schema";

export const UpdateMemberSchema = z.object({
    currentPoints: z.number().int().min(0, 'Current points must be a positive number'),
    reedemPoints: z.number().int().min(0, 'Reedem points must be a positive number'),
}).merge(MemberGeneralInfoSchema);

export const NewMemberPaymentSchema = z.object({
    amount: z.number().multipleOf(0.01),
    paymentMethod: z.string(),
    statement: z.string(),
    description: z.string(),
    authorize: z.boolean(),
});

export const NewEnrollmentSchema = z.object({
    programId: z.number(),
    planId: z.number(),
    startDate: z.date(),
    endDate: z.date().optional(),
    trail: z.number(),
    paymentMethod: z.string(),
})