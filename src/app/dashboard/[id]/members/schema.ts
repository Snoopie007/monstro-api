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
    billing: z.object({
        cardHolderName: z.string().optional(),
        stripeToken: z.string().optional(),
    }),
}).merge(MemberGeneralInfoSchema);


