

export type MonstroLauncher = {
    id: number;
    name: string;
    price: number;
    downPayment: number;
    monthlyPayment: number;
    term: number;
    benefits: string[];
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    cycle: string;
    benefits: string[];
}



const launchers: MonstroLauncher[] = [
    {
        id: 1,
        name: "Launcher 1",
        price: 8000,
        downPayment: 2000,
        monthlyPayment: 499,
        term: 12,
        benefits: [
            "Benefit 1",
            "Benefit 2",
            "Benefit 3",
        ],
    },
    {
        id: 2,
        name: "Launcher 2",
        price: 10000,
        downPayment: 3000,
        monthlyPayment: 599,
        term: 12,
        benefits: [
            "Benefit 1",
            "Benefit 2",
            "Benefit 3",
        ],
    }
]

const plans: MonstroPlan[] = [
    {
        id: 1,
        name: "Plan 1",
        price: 10000,
        cycle: "monthly",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],
    },
    {
        id: 2,
        name: "Plan 2",
        price: 12000,
        cycle: "monthly",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],
    },
    {
        id: 3,
        name: "Plan 3",
        price: 14000,
        cycle: "monthly",
        benefits: ["Benefit 1", "Benefit 2", "Benefit 3"],

    }
]

const addons = [
    {
        id: 1,
        name: "Addon 1",
        description: "Addon 1 description",
        price: 1000,
        recurring: true,
        cycle: "monthly",
    }
]

export { launchers, plans, addons };
