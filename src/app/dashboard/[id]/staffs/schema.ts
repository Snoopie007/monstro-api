import z from 'zod';

const InviteStaffSchema = z.object({
    firstName: z.string().min(2, { message: "Required" }),
    lastName: z.string().min(2, { message: "Required" }),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
    email: z.string().min(8).email("invalid email."),
    role: z.array(z.string()),
    changePassword: z.boolean().default(false),
});

export {
    InviteStaffSchema
}