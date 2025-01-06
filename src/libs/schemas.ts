
import * as z from "zod";

export const UserInfoSchema = z.object({
    email: z.string().min(8).email("invalid email."),
    firstName: z.string().min(2, { message: "Required" }),
    lastName: z.string().min(2, { message: "Required" }),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
    referralCode: z.string().optional()
});

export const PasswordSchema = z.object({
    password: z.string().min(8, { message: "password must be atleast 8 characters long." }).refine(
        (v) => /[!@#$&]/.test(v), "password must contain atleast one symbol !@#$&*.")
        .refine((v) => /[A-Z]/.test(v), "password must contain atleast one UPPERCASE letter.")
        .refine((v) => /[0-9]/.test(v), "password must contain atleast one number.")
        .refine((v) => !/[()*+\-[\]{}|`~<>,.\/?^]/.test(v), "password contains invalid characters."),
});


export const AddCreditCardSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    address: z.object({
        line1: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
    }).optional(),
});






