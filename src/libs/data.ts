import { MonstroPackage, MonstroPlan } from "@/types/vendor";

const CountryCodes = [
    { name: "Canada", code: "CA", shortName: "CAD" },
    { name: 'United States', code: "US", shortName: "USA" },
    { name: "United Kingdom", code: "UK", shortName: "GB" },
    { name: "Australia", code: "AU", shortName: "AUS" }
]

const MonstroData = {
    fullAddress: '7901 4th ST N STE 300 St Petersburg, FL 33702, USA',
    phone: '123-456-7890',
    email: 'stevey@simplygrowonline.com',
    name: 'John Doe',
    url: 'https://mymonstro.com',
    privacyUrl: 'https://mymonstro.com/legal/privacy-policy',
    termsUrl: 'https://mymonstro.com/legal/terms-of-service',
    supportUrl: 'https://mymonstro.com/support',
    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
    logoUrl: 'https://mymonstro.com/logo.png',
}

const PaymentMethods: string[] = [
    "card",
    "cash",
    "zelle",
    "bank payment",
    "cheque"
]

const TimeZones = [
    "GMT-04:00 America/New_York (EDT)",
    "GMT-05:00 America/Chicago (CDT)",
    "GMT-06:00 America/Denver (MDT)",
    "GMT-07:00 America/Los_Angeles (PDT)",
    "GMT-08:00 America/Anchorage (AKDT)",
    "GMT-09:00 America/Adak (HDT)",
    "GMT-10:00 Pacific/Honolulu (HST)"
]

const Regions = {
    us: {
        regions: [
            "Alabama",
            "Alaska",
            "Arizona",
            "Arkansas",
            "California",
            "Colorado",
            "Connecticut",
            "Delaware",
            "Florida",
            "Georgia",
            "Hawaii",
            "Idaho",
            "Illinois",
            "Indiana",
            "Iowa",
            "Kansas",
            "Kentucky",
            "Louisiana",
            "Maine",
            "Maryland",
            "Massachusetts",
            "Michigan",
            "Minnesota",
            "Mississippi",
            "Missouri",
            "Montana",
            "Nebraska",
            "Nevada",
            "New Hampshire",
            "New Jersey",
            "New Mexico",
            "New York",
            "North Carolina",
            "North Dakota",
            "Ohio",
            "Oklahoma",
            "Oregon",
            "Pennsylvania",
            "Rhode Island",
            "South Carolina",
            "South Dakota",
            "Tennessee",
            "Texas",
            "Utah",
            "Vermont",
            "Virginia",
            "Washington",
            "West Virginia",
            "Wisconsin",
            "Wyoming"
        ]
    },
    canada: {
        regions: [
            "Alberta",
            "British Columbia",
            "Manitoba",
            "New Brunswick",
            "Newfoundland and Labrador",
            "Nova Scotia",
            "Ontario",
            "Prince Edward Island",
            "Quebec",
            "Saskatchewan"
        ]
    }
}

const Industries = [
    "Martial Arts School",
    "Boxing Gym",
    "Fitness & Crossfit Gym",
    "Gymnastics Gym",
    "Dance Studio",
    "Swim School",
    "Music School",
    "Coding School",
    "Yoga Studio",
    "Pilates Studio",
    "Kickboxing Gym",
    "Sports Camp",
    "Cooking School",
    "Arts & Crafts School",
    "Tutoring",
    "Other"
]

const IS_PRODUCTION = process.env.NODE_ENV === "production"

const GROWTH_PLAN_ID = IS_PRODUCTION ? "price_1R4WXrDePDUzIffAoH2vxWKS" : "price_1R4SBoDePDUzIffACO41pu6i"
const SCALE_PLAN_ID = IS_PRODUCTION ? "price_1R4WYJDePDUzIffAHbhu59ag" : "price_1R4SAwDePDUzIffAuu9dm7Qi"
const BASIC_PLAN_ID = IS_PRODUCTION ? "price_1R4WeVDePDUzIffAZQPObJhE" : "price_1R4SG5DePDUzIffAz3GU05uZ"
const PREMIUM_PLAN_ID = IS_PRODUCTION ? "price_1QZS9xDePDUzIffA00000000" : "price_1R4UUNDePDUzIffArAlN6mq6"


const packages: MonstroPackage[] = [
    {
        id: 1,
        name: "Growth",
        price: 3500,
        description: "Grow your business with our comprehensive package that includes everything you need to grow your online presence and a member management system that grows your bottom line.",
        benefits: [
            {
                name: "5 Page High-Converting Website",
                description: "We will build a 5 page website that not only will make your brand stand out, but also tested and proven to convert your visitors."
            },
            {
                name: "12mo. of Monstro",
            },
            {
                name: "12mo. of Monstro Marketing Suite",
                description: "Get access to Monstro Marketing Suite, capabale of creating unlimited marketing campaigns."
            },
            {
                name: "12mo. of Premium Support",
                description: "Get personalized support from our team to help you get the most out of Monstro."
            }
        ],
        paymentPlans: [
            {
                id: 1,
                name: "Pay In Full",
                description: "Pay in full today for a $500 discount.",
                downPayment: 3500,
                discount: 500,
                monthlyPayment: 0,
                length: 0,
                interval: "mo.",
                trial: 0,
                priceId: GROWTH_PLAN_ID,
            },
            {
                id: 2,
                name: "500 Down",
                description: "$500 down, $300 for 10 months.",
                downPayment: 500,
                monthlyPayment: 300,
                discount: 0,
                length: 10,
                interval: "mo.",
                trial: 30,
                priceId: GROWTH_PLAN_ID,
            },
            {
                id: 3,
                name: "0 Down",
                description: "Pay 0 down, $300 for 14 months.",
                downPayment: 0,
                discount: 0,
                monthlyPayment: 300,
                length: 14,
                interval: "mo.",
                trial: 0,
                priceId: GROWTH_PLAN_ID,
            }

        ]
    },
    {
        id: 2,
        name: "Scale",
        price: 6000,
        description: "Ramp up your business with our comprehensive package that includes everything you need to grow your business from marketing to member management.",
        benefits: [
            {
                name: "10 Page High-Converting Website",
                description: "We will build a 10 page website that not only will make your brand stand out, but also tested and proven to convert your visitors."
            },
            {
                name: "12mo. of Monstro",
            },
            {
                name: "12mo. of Monstro Marketing Suite",
                description: "Get access to Monstro Marketing Suite, capabale of creating unlimited marketing campaigns."
            },
            {
                name: "12mo. of Premium Support",
                description: "Get personalized support from our team to help you get the most out of Monstro."
            },
            {
                name: "3mo. of SEO",
                description: "Get access to our SEO experts to help you get more traffic to your website."
            }
        ],
        paymentPlans: [
            {
                id: 4,
                name: "Pay In Full",
                description: "Pay in full today for a $1,000 discount.",
                downPayment: 6000,
                discount: 1000,
                monthlyPayment: 500,
                length: 0,
                trial: 0,
                interval: "mo.",
                priceId: SCALE_PLAN_ID,
            },
            {
                id: 5,
                name: "1000 Down",
                description: "1000 down, $500 for 10 months.",
                downPayment: 1000,
                monthlyPayment: 500,
                length: 10,
                interval: "mo.",
                discount: 0,
                trial: 30,
                priceId: SCALE_PLAN_ID,
            },
            {
                id: 6,
                name: "0 Down",
                description: "Pay 0 down, $500 for 14 months.",
                downPayment: 0,
                discount: 0,
                monthlyPayment: 500,
                length: 14,
                interval: "mo.",
                trial: 0,
                priceId: SCALE_PLAN_ID,
            }

        ]
    }
]

const BaseBenefits = [{
    name: "Attendance Management",
    description: "Track and manage member attendance"
},
{
    name: "Member Portal & App",
    description: "Provide members with online access"
},
{
    name: "Payment Processing",
    description: "Process payments securely"
},
{
    name: "Online Member CheckOuts",
    description: "Allow members to check out online"
},
{
    name: "Basic Support",
    description: "Email & live chat support only."
}]

const plans: MonstroPlan[] = [

    {
        id: 1,
        name: "Pay as you go",
        price: 0,
        usagePercent: 2,
        interval: "week",
        threshold: 4,
        aiBots: 0,
        benefits: BaseBenefits,
        description: `Get full access to Monstro member management free. Pay only for 2% of transactions you process with Monstro.`,
        note: "Stripe transaction fees (2.9% + $0.30) apply on top of the 2%",
        priceId: undefined
    },
    {
        id: 2,
        name: "Basic",
        price: 99,
        interval: "week",
        usagePercent: 2,
        threshold: 4,
        aiBots: 1,
        benefits: [
            ...BaseBenefits,
            {
                name: "1x AI Bot",
                description: "1x AI Bot to help you manage your business."
            },
            {
                name: "Monstro Marketing Suite",
                description: "Advance marketing automation, landing page builder, reputation management, appointment scheduling, and more."
            }

        ],
        description: "Everything in pay as you go + 1x AI Bot + Monstro Marketing Suite with basic support (email & live chat only). Pay only for transactions.",
        note: "Stripe transaction fees (2.9% + $0.30) apply on top of the 2%",
        priceId: BASIC_PLAN_ID
    },
    {
        id: 3,
        name: "Premium",
        price: 299,
        interval: "week",
        usagePercent: 0,
        aiBots: 10,
        threshold: 4,
        benefits: [
            ...BaseBenefits,
            {
                name: "10x AI Bots",
                description: "Get access to 10x AI Bots to help you manage your business."
            },
            {
                name: "Monstro Marketing Suite",
                description: "Get access to Monstro Marketing Suite, capabale of creating unlimited marketing campaigns."
            },
            {
                name: "Premium Support",
                description: "Get priority support from our team to help you get the most out of Monstro."
            }
        ],
        description: `No additional transaction fees plus get full access to Monstro marketing suite, 10x AI Bots, and premium support.`,
        note: "No additional transaction fees but Stripe transaction fees (2.9% + $0.30) still apply.",
        priceId: PREMIUM_PLAN_ID
    }
]





export {
    CountryCodes,
    Regions,
    TimeZones,
    Industries,
    MonstroData,
    plans, packages, PaymentMethods
}