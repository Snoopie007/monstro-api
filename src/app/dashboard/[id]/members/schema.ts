import z from 'zod';

export const MemberGeneralInfoSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(2, 'Phone number is required'),
});

export const CreateMemberSchema = z.object({
    programId: z.number(),
    planId: z.number(),
    paymentMethod: z.string(),
    paymentMode: z.string().default("manual"),
    billing: z.object({
        tokenId: z.string().optional(),
        name: z.string().optional(),
        address_line1: z.string().optional(),
        address_city: z.string().optional(),
        address_state: z.string().optional(),
        address_zip: z.string().optional(),
    }),
})
    .merge(MemberGeneralInfoSchema)
    .superRefine((data, ctx) => {
        if (data.paymentMethod === "card" && !data.billing.tokenId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Card token is required",
            });
        }
    });

