import type { Currency } from "square";

export type Address = {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
};

export type Customer = {
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    address?: Address;
};
export type ChargeOptions = {
    total: number,
    feesAmount: number,
    currency: Currency,
}
