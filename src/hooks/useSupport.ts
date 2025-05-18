import useSWR from "swr";

async function fetcher({ url }: { url: string }) {
    const res = await fetch(`/api/protected/vendor/${url}`);
    if (!res.ok) {
        throw new Error("An error occurred while fetching the data.");
    }

    return await res.json();
}
function useCases() {

    const { data, error, isLoading, mutate } = useSWR({ url: `/support/cases` }, fetcher);
    return {
        cases: data,
        error,
        isLoading,
        mutate,
    };
}



export {
    useCases,
};
