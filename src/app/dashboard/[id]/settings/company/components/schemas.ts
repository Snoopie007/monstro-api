import { z } from "zod";

export const CompanyInfoSchema = z.object({
    name: z.string(),
    // legalName: z.string(),
    email: z.string().email("invalid email."),
    phone: z.string(),
    industry: z.string(),
    logoUrl: z.string(),
    website: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postal: z.string(),
    country: z.string(),
    timezone: z.string(),
});
