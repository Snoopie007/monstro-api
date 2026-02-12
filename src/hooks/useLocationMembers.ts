import { clientsideApiClient } from "@/libs/api/client";
import { LocationMembersResponse } from "@subtrees/types/member";
import { ColumnFiltersState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "./useSession";

interface UseLocationMembersParams {
    locationId: string;
    page: number;
    size: number;
    query: string;
    tags: string[];
    tagOperator: 'AND' | 'OR';
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    columnFilters: ColumnFiltersState;
    enabled?: boolean;
}

export function useLocationMembers({
    locationId,
    page,
    size,
    query,
    tags,
    tagOperator,
    sortBy,
    sortOrder,
    columnFilters,
    enabled = true,
}: UseLocationMembersParams) {
    const { data: session } = useSession();

    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);

    const queryParams: Record<string, string | number> = {
        page: page + 1,
        size,
    };

    if (query) queryParams.query = query;
    if (tags.length > 0) {
        queryParams.tags = tags.join(',');
        queryParams.tagOperator = tagOperator;
    }
    if (sortBy) queryParams.sortBy = sortBy;
    if (sortOrder) queryParams.sortOrder = sortOrder;
    if (columnFilters.length > 0) {
        queryParams.columnFilters = JSON.stringify(columnFilters);
    }

    const { data, error, isLoading, isFetching, refetch } = useQuery<LocationMembersResponse>({
        queryKey: ['locationMembers', locationId, page, size, query, tags, tagOperator, sortBy, sortOrder, columnFilters],
        queryFn: async () => {
            if (!api) throw new Error("No API client available");
            return api.get<LocationMembersResponse>(`/x/loc/${locationId}/members`, queryParams);
        },
        enabled: !!locationId && !!api && enabled,
        placeholderData: (previousData) => previousData,
        staleTime: 0,
    });

    return {
        members: data?.members ?? [],
        count: data?.count ?? 0,
        customFields: data?.customFields ?? [],
        error,
        isLoading,
        isFetching,
        refetch,
    };
}

