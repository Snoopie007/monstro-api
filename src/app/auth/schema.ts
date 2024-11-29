import { PasswordSchema, UserInfoSchema } from "@/libs/schemas";
import * as z from "zod";


export const LoginSchema = z.object({
    email: z.string().min(8).email("invalid email.")
}).merge(PasswordSchema);

export const VendorRegistrationSchema = z.object({
    confirmPassword: z.string().min(8),
}).merge(PasswordSchema).merge(UserInfoSchema);


export const ForgotPasswordSchema = z.object({
    email: z.string().min(8).email("invalid email."),
});

export const ResetPasswordSchema = z.object({
    email: z.string().min(8).email("invalid email."),
    token: z.string(),
    password_confirmation: z.string().min(8)
}).merge(PasswordSchema);