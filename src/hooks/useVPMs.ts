import useSWR from "swr";

async function fetcher(data: { url: string }) {
    const res = await fetch(`/api/protected/vendor/${data.url}`);
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
