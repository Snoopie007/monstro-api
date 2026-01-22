
import z from 'zod';

export const MemberGeneralInfoSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(2, 'Phone number is required'),
});

export const MemberProgramSchema = z.object({
    startDate: z.iso.datetime(),
    memberPlanId: z.number(),
    other: z.object({
        skipContract: z.boolean().optional(),
        programId: z.number().min(1, "Program is required"),
        cardId: z.string().optional(),
    }),

    pkg: z.object({
        expireDate: z.iso.datetime().optional(),
        totalClassLimit: z.number().min(0, "Total class limit must be greater than 0").max(100, "Total class limit must be less than 100").optional(),
    }),
    sub: z.object({
        endDate: z.iso.datetime().optional(),
        trailDays: z.number().int().optional(),
        allowProration: z.boolean().optional(),
    })
})

export const NewMemberPaymentSchema = z.object({
    tokenId: z.string().optional(),
    name: z.string().optional(),
    address_line1: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    address_zip: z.string().optional(),
})

export const CreateMemberSchema = z.object({
    dob: z.string().optional(),
    gender: z.string().optional(),
}).and(MemberGeneralInfoSchema)
