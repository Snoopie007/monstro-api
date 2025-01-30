export type UserSelection = {
    plan: MonstroPlan | null;
    paymentPlan: MonstroPaymentPlan | null;
    // addon: Addon | null;
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    benefits: string[];
    paymentPlans: MonstroPaymentPlan[];
}

export type MonstroPaymentPlan = {
    name: string;
    description: string;
    downPayment: number;
    monthlyPayment: number;
    length: number;
    interval: string;
    discount: number;
    bonuses: string[];
    trial: number;
    priceId: string;
}

export type Addon = {
    id: number;
    name: string;
    price: number;
    interval: string;
    benefits: string[];
    description: string;
    priceId: string;
}



const plans: MonstroPlan[] = [
    {
        id: 1,
        name: "Scale",
        price: 8000,
        benefits: [
            "Benefit 1",
            "Benefit 2",
            "Benefit 3",
        ],
        paymentPlans: [
            {
                name: "Pay In Full",
                description: "Pay in full today for a $500 discount.",
                downPayment: 8000,
                discount: 500,
                monthlyPayment: 0,
                length: 0,
                interval: "mo.",
                trial: 0,
                bonuses: ["$500 off", "+3 mo. of SEO"],
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "12 Months",
                description: "$2000 down,  $500 for 12 months.",
                downPayment: 2000,
                monthlyPayment: 500,
                discount: 0,
                length: 12,
                interval: "mo.",
                trial: 30,
                bonuses: ["+2 mo. of SEO"],
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "0 Down",
                description: "Pay 0 down, $500 for 18 months.",
                downPayment: 0,
                discount: 0,
                monthlyPayment: 500,
                length: 18,
                interval: "mo.",
                trial: 0,
                bonuses: ["+1 mo. of SEO"],
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }

        ]
    },
    {
        id: 2,
        name: "Monster",
        price: 15000,
        benefits: [
            "Benefit 1",
            "Benefit 2",
            "Benefit 3",
        ],
        paymentPlans: [
            {
                name: "12 Months",
                description: "12 Months payment plan",
                downPayment: 8000,
                monthlyPayment: 500,
                length: 12,
                interval: "mo.",
                discount: 0,
                trial: 30,
                bonuses: ["+3 mo. of SEO"],
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "Pay In Full",
                description: "24 Months payment plan",
                downPayment: 15000,
                discount: 1000,
                monthlyPayment: 0,
                length: 0,
                trial: 0,
                interval: "mo.",
                bonuses: ["+3 mo. of SEO", "$1000 off"],
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }
        ]
    }
]

const addons: Addon[] = [
    {
        id: 1,
        name: "Basic",
        price: 99,
        interval: "month",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],
        description: "Per billing cycle ( 4 weeks ).",
        priceId: "price_1NVhpUDePDUzIffAFvqs2pzY"
    },
    {
        id: 2,
        name: "Advanced",
        price: 199,
        interval: "mo.",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],
        description: "Per billing cycle ( 4 weeks ).",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    },
    {
        id: 3,
        name: "Premium",
        price: 299,
        interval: "mo.",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],
        description: "Per billing cycle ( 4 weeks ).",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    }
]


export { plans, addons };
