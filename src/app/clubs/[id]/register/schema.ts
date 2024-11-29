import { PasswordSchema, UserInfoSchema } from "@/libs/schemas";
import * as z from "zod";

export const MemberRegistrationSchema = z.object({
    confirmPassword: z.string().min(8),
}).merge(UserInfoSchema).merge(PasswordSchema);

export const BillingSchema = z.object({
    nameOnCard: z.string().min(2, { message: "Required" }),
    address: z.string().min(2, { message: "Required" }),
});


