
import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useRoles(id: string) {
    const { data, error, isLoading } = useSWR({url: `roles`, id: id}, fetcher);
    return {
        roles: data,
        error,
        isLoading,
    };
}

export { useRoles };
