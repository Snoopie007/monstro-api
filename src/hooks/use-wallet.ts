


import { fetcher } from "@/libs/api";
import useSWR from "swr";



function useWallet(locationId: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `vendor/wallet`, id: locationId }, fetcher);

    return {
        wallet: data,
        error,
        isLoading,
        mutate
    };
}

export { useWallet };
