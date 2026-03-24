export const getCurrency = (country: string) => {
    switch (country) {
        case "US":
            return "usd";
        case "CA":
            return "cad";
        case "UK":
            return "gbp";
        case "AU":
            return "aud";
    }
}