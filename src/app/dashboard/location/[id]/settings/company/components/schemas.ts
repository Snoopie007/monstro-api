import { z } from "zod";

export const CompanyAddressSchema = z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
});

export const CompanyPhoneSchema = z.object({
    phone: z.string().min(8, "Phone is required"),
});


export const CompanyNameSchema = z.object({
    name: z.string().min(3, "Name is required"),
});

export const CompanyWebsiteSchema = z.object({
    website: z.string().min(6, "Website is required").url("Invalid website format"),
});

export const CompanyEmailSchema = z.object({
    email: z.string().min(6, "Email is required").email("Invalid email format")
});

export const CompanyLegalNameSchema = z.object({
    legalName: z.string().min(3, "Legal name is required"),
});






