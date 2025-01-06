
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

function usePermissions(id: string) {
    const { data, error, isLoading } = useSWR({url: `roles/permissions`, id: id}, fetcher);
    return {
        permissions: data,
        error,
        isLoading,
    };
}

export { useRoles, usePermissions };
