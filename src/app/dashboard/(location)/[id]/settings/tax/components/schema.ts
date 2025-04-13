import { z } from "zod";

export const TaxRegistraionSchema = z.object({

    state: z.string().min(1),
    type: z.string().min(1),
});


export const TaxSettingsSchema = z.object({
    office: z.object({
        country: z.string().min(1),
        state: z.string().min(1),
        city: z.string().min(1),
        line1: z.string().min(1),
        postal_code: z.string().min(1),
    }),
    tax_behavior: z.string().min(1),
    tax_code: z.string().min(1),
});

export const USTaxTypes = [
    {
        name: "Sales Tax",
        code: "state_sales_tax",
    },
    {
        name: "Retail Delivery Tax",
        code: "retail_delivery_tax",
    }
]


export const TaxBehaviors = [
    {
        name: "Exclusive",
        code: "exclusive",
    },
    {
        name: "Inclusive",
        code: "inclusive",
    },
    {
        name: "Automatic",
        code: "inferred_by_currency",
    },

]

export const TaxCodes = [
    {
        name: "Services",
        code: "txcd_99999999",
    },
    {
        name: "Goods",
        code: "txcd_20030000",
    },
    {
        name: "Digital Goods or Services",
        code: "txcd_10000000",
    },


]

