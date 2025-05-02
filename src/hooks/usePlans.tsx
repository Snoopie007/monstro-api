import useSWR from "swr";
import { fetcher } from "./hooks";

function useSubscriptions(id: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `plans/subs`, id: id }, fetcher);
    return {
        subscriptions: data,
        error,
        isLoading,
        mutate
    };
}


function usePackages(id: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `plans/pkgs`, id: id }, fetcher);
    return {
        packages: data,
        error,
        isLoading,
        mutate
    };
}
export {
    useSubscriptions,
    usePackages
}
