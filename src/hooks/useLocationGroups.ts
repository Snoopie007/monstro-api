import { clientsideApiClient } from "@/libs/api/client";
import { Group } from "@subtrees/types/group";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "./useSession";

export const useLocationGroups = (id: string) => {
    const { data: session } = useSession();

    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);

    const { data, error, isLoading, refetch } = useQuery<Group[]>({
        queryKey: ['locationGroups', id],
        queryFn: async () => {
            if (!api) throw new Error("No API client available");
            return api.get<Group[]>(`/x/loc/${id}/groups`);
        },
        enabled: !!id && !!api,
    });

    return { 
        groups: data ?? [], 
        error, 
        isLoading, 
        refetch 
    };
};

