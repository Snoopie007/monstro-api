
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
    password: z.string()
        .min(8, { message: "password must be atleast 8 characters long." })
        .refine((v) => /[^a-zA-Z0-9]/.test(v), { message: "password must contain atleast one symbol." })
        .refine((v) => /[A-Z]/.test(v), { message: "password must contain atleast one UPPERCASE letter." })
        .refine((v) => /[0-9]/.test(v), { message: "password must contain atleast one number." })
});

export const RegisterSchema = z.object({
    firstName: z.string().min(2, "Required"),
    lastName: z.string().min(2, "Required"),
    phone: z.string().min(11, { message: 'Invalid phone number' }),
}).merge(PasswordSchema).merge(EmailSchema);


export const AddCreditCardSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    type: z.enum(["card", "us_bank_account"]),
    address: z.object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        postal_code: z.string().optional(),
    })
});


export const LoginSchema = z.object({
    token: z.string().min(6, "Invalid token."),
    type: z.enum(["email", "sms"]).optional(),
    email: z.string().min(8, "Email is required.").email("invalid email."),
    password: z.string().min(8, "Password is required."),
})

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
    name: z.string({ message: "Business name is required." }).min(1),
    industry: z.string({ message: "Select an industry." }).min(1),
    address: z.string({ message: "Address is required." }).min(8),
    city: z.string({ message: "City is required." }).min(3),
    state: z.string({ message: "State is required." }).min(1),
    country: z.string({ message: "Country is required." }).min(2),
    postalCode: z.string({ message: "Postal code is required." }).min(3),
    website: z.string().optional(),
    slug: z.string(),
    phone: z.string({ message: "Phone number is required." }).min(11),
});

export const VendorBillingSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    address_line1: z.string().min(2, { message: "Required" }),
    address_city: z.string().min(2, { message: "Required" }),
    address_state: z.string().min(2, { message: "Required" }),
    address_zip: z.string().min(2, { message: "Required" })
});

export const VendorInviteSchema = z.object({
    email: z.string().min(1, { message: "Email is required" }).email({ message: "Invalid email address" }),
}).merge(PasswordSchema);



