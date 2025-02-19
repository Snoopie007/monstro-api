
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

export const RegisterSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
}).merge(PasswordSchema);


export const AddCreditCardSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    address: z.object({
        line1: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
    }).optional(),
});


export const LoginSchema = z.object({
    email: z.string().min(8, "Email is required.").email("invalid email."),
}).merge(PasswordSchema);

export const VendorRegistrationSchema = z.object({
    confirmPassword: z.string().min(8),
}).merge(PasswordSchema).merge(UserInfoSchema);


export const ForgotPasswordSchema = z.object({
    email: z.string().min(8, "Email is required.").email("invalid email."),
});

export const ResetPasswordSchema = z.object({
    email: z.string().min(8, "Email is required.").email("invalid email."),
    token: z.string(),
    password_confirmation: z.string().min(8)
}).merge(PasswordSchema);


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
