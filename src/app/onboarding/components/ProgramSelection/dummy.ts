export type UserSelection = {
    plan: MonstroPackage | null;
    paymentPlan: PackagePaymentPlan | null;
    addon: MonstroPlan | null;
}

export type MonstroPackage = {
    id: number;
    name: string;
    description: string;
    price: number;
    benefits: { name: string, description?: string }[];
    paymentPlans: PackagePaymentPlan[];
}

export type PackagePaymentPlan = {
    name: string;
    description: string;
    downPayment: number;
    monthlyPayment: number;
    length: number;
    interval: string;
    discount: number;
    trial: number;
    priceId: string;
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    interval: string;
    benefits: { name: string, description?: string }[];
    description: string;
    priceId: string;
    note?: string;
}



const packages: MonstroPackage[] = [
    {
        id: 1,
        name: "Scale",
        price: 8000,
        description: "Scale your business with our comprehensive package that includes everything you need to grow your online presence. Get access to premium features, dedicated support, and proven strategies.",
        benefits: [
            {
                name: "Benefit 1",
                description: "Benefit 1 description"
            },
            {
                name: "Benefit 2",
                description: "Benefit 2 description"
            }

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
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }

        ]
    },
    {
        id: 2,
        name: "Monster",
        price: 15000,
        description: "Our most comprehensive plan, designed for businesses that want to maximize their growth potential. Includes advanced features, priority support, and exclusive benefits to help scale your business effectively.",
        benefits: [
            {
                name: "Benefit 1",
                description: "Benefit 1 description"
            },
            {
                name: "Benefit 2",
                description: "Benefit 2 description"
            }
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
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }
        ]
    }
]

const plans: MonstroPlan[] = [

    {
        id: 1,
        name: "Pay as you go",
        price: 0,
        interval: "mo.",
        benefits: [{
            name: "$10 per new member",
            description: "You'll be charged $10 per new member (once), and 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1% per transaction",
            description: "You'll be charged 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1x AI Bot"
        }],
        description: `Get full access to Monstro free with basic support (email & live chat only). Pay only for new member sign ups and transactions. 
        <span>You'll be charged $10 per new member (once).`,
        note: "Stripe transaction fees apply. (2.9% + $0.30)",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    },
    {
        id: 2,
        name: "Basic",
        price: 99,
        interval: "mo.",
        benefits: [{
            name: "$10 per new member",
            description: "You'll be charged $10 per new member (once), and 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1% per transaction",
            description: "You'll be charged 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1x AI Bot"
        }],
        description: "Get full access to Monstro free with basic support (email & live chat only). Pay only for new member sign ups and transactions.",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    },
    {
        id: 3,
        name: "Premium",
        price: 299,
        interval: "mo.",
        benefits: [
            {
                name: "No new member fee",
                description: "No extra charges when a new member joins your business."
            },
            {
                name: "0% per transaction",
                description: "No additional transaction fees. Standard stripe transaction still applies (2.9% + $0.30)."
            },
            {
                name: "Unlimited",
            },
            {
                name: "Advance Automation",
                description: "Advance Automation"
            },
            {
                name: "Monstro Marketing Suite",
                description: "Get access to Monstro Marketing Suite, capabale of creating unlimited marketing campaigns."
            },
            {
                name: "Premium Support",
            }
        ],
        description: `Get full access to Monstro free. No new member fees. 
            <span> No additional transaction fees.fsdfsdfsd.
        `,
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    }
]

export { plans, packages };
