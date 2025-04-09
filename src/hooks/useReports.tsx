
import useSWR from "swr";
import { fetcher } from "./hooks";



function useReport(id: string, type: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `reports/?type=${type}`, id: id }, fetcher);

    return {
        reward: data,
        error,
        isLoading,
        mutate,
    };
}

export { useReport };
