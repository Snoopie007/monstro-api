import type { Currency } from "square";

export const getCurrency = (country: string): Currency => {
    switch (country) {
        case "US":
            return "USD";
        case "CA":
            return "CAD";
        case "UK":
            return "GBP";
        case "AU":
            return "AUD";
        default:
            return "USD";
    }
}