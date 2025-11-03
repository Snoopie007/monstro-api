import useSWR from "swr";

async function fetcher() {
    const res = await fetch("/api/protected/account/payments");
    if (!res.ok) throw new Error("Failed to fetch payment methods");
    return res.json();
}

function useVPMs() {
    const { data, error, isLoading, mutate } = useSWR("vpms", fetcher);
    return { methods: data, error, isLoading, mutate };
}

export { useVPMs };
