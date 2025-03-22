export type MonstroPlansBenefits = {
    name: string;
    description?: string;
}


export type MonstroPackage = {
    id: number;
    name: string;
    description: string;
    price: number;
    benefits: MonstroPlansBenefits[];
    paymentPlans?: PackagePaymentPlan[];
}

export type PackagePaymentPlan = {
    id: number;
    name: string;
    description: string;
    downPayment: number;
    monthlyPayment: number;
    length: number;
    interval: string;
    discount: number;
    trial: number;
    priceId: string | null;
    testPriceId: string | null;
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    usagePercent: number;
    threshold: number;
    interval: string;
    benefits: MonstroPlansBenefits[];
    description: string;
    priceId: string | null;
    testPriceId: string | null;
    aiBots: number;
    note?: string | null;
    coupon?: string | null;
}
