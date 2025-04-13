
import useSWR from "swr";
import { fetcher } from "./hooks";



function useTaxSettings(locationId: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `tax`, id: locationId }, fetcher);

    return {
        data,
        error,
        isLoading,
        mutate
    };
}

export { useTaxSettings };
