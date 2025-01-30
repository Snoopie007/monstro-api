export type MonstroLauncher = {
    id: number;
    name: string;
    price: number;
    downPayment: number;
    monthlyPayment: number;
    term: number;
    cycle: string;
    benefits: string[];
}
export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    cycle: string;
    benefits: string[];
}
