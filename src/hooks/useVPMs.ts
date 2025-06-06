import useSWR from "swr";

async function fetcher() {
    const res = await fetch("/api/protected/vendor/payment/methods");
    if (!res.ok) throw new Error("Failed to fetch payment methods");
    return res.json();
}

function useVendorPaymentMethods() {
    const { data, error, isLoading, mutate } = useSWR("payment-methods", fetcher);
    return { methods: data, error, isLoading, mutate };
}

export { useVendorPaymentMethods };
