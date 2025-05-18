import useSWR from "swr";

async function fetcher([url, id, query]: [string, string, string]) {
    const res = await fetch(`/api/protected/vendor/${id}/${url}${query ? `?${query}` : ""}`);
    if (!res.ok) {
        throw new Error("An error occurred while fetching the data.");
    }

    return await res.json();
}




function useVendorPaymentMethods() {

    const { data, error, isLoading, mutate } = useSWR({ url: `/payment/methods` }, fetcher);
    return {
        methods: data,
        error,
        isLoading,
        mutate,
    };
}



export {

    useVendorPaymentMethods,
};
