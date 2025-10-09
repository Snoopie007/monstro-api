
import useSWR from "swr";
import { fetcher } from "./hooks";
function useRoles(id: string, query: string = "") {
    const { data, error, isLoading, mutate } = useSWR({ url: `roles`, id: id, query: `query=${query}` }, fetcher);
    return {
        roles: data,
        error,
        isLoading,
        mutate,
    };
}

function usePermissions(id: string) {
    const { data, error, isLoading } = useSWR({ url: `roles/permissions`, id: id }, fetcher);
    return {
        permissions: data,
        error,
        isLoading,
    };
}

export { useRoles, usePermissions };
