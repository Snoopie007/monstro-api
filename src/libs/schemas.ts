
import * as z from "zod";

export const EmailSchema = z.object({
    email: z.string()
        .trim()
        .min(5, "Email is too short")
        .max(254, "Email is too long")
        .email("Invalid email address")
        .refine(email => email.includes("."), {
            message: "Email must contain a domain extension"
        }),
});

export const UserInfoSchema = z.object({
    firstName: z.string().min(2, { message: "Required" }),
    lastName: z.string().min(2, { message: "Required" }),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
    referralCode: z.string().optional()
}).merge(EmailSchema);

export const PasswordSchema = z.object({
    password: z.string().min(8, { message: "password must be atleast 8 characters long." }).refine(
        (v) => /[!@#$&]/.test(v), "password must contain atleast one symbol !@#$&*.")
        .refine((v) => /[A-Z]/.test(v), "password must contain atleast one UPPERCASE letter.")
        .refine((v) => /[0-9]/.test(v), "password must contain atleast one number.")
        .refine((v) => !/[()*+\-[\]{}|`~<>,.\/?^]/.test(v), "password contains invalid characters."),
});

export const RegisterSchema = z.object({
    firstName: z.string().min(2, "Required"),
    lastName: z.string().min(2, "Required"),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
}).merge(PasswordSchema).merge(EmailSchema);


export const AddCreditCardSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    default: z.boolean().optional(),
    address_line1: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    address_zip: z.string().optional(),
});


export const LoginSchema = z.object({
    email: z.string().min(8, "Email is required.").email("invalid email."),
}).merge(PasswordSchema);

export const VendorRegistrationSchema = z.object({
    confirmPassword: z.string().min(8),
}).merge(PasswordSchema).merge(UserInfoSchema);




export const ResetPasswordSchema = z.object({
    token: z.string(),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long")
}).merge(PasswordSchema).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
);


export const LocationSetupSchema = z.object({
    name: z.string().min(1, "Business name is required."),
    industry: z.string().min(1, "Please select at least one category."),
    address: z.string().min(8, "Address is required."),
    city: z.string().min(3, "City is required."),
    state: z.string().min(1, "State is required."),
    country: z.string().min(2, "Country is required."),
    postalCode: z.string().min(3, "Postal code is required."),
    website: z.string().optional(),
    phone: z.string().min(11, "Phone number is required."),
    logoUrl: z.string().optional(),
});

export const VendorBillingSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    address_line1: z.string().min(2, { message: "Required" }),
    address_city: z.string().min(2, { message: "Required" }),
    address_state: z.string().min(2, { message: "Required" }),
    address_zip: z.string().min(2, { message: "Required" })
});
