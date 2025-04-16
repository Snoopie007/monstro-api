
import useSWR from "swr";
import { fetcher } from "./hooks";



function useReport(id: string) {
    const { data, error, isLoading } = useSWR({ url: `reports`, id: id }, fetcher);

    return {
        reports: data,
        error,
        isLoading,
    };
}

export { useReport };
