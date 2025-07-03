import useSWR from "swr";
import { fetcher } from "./hooks";
import { MemberPlan } from "@/types/member";

function useSubscriptions(id: string) {
    const { data, error, isLoading, mutate } = useSWR<MemberPlan[]>({ url: `plans/subs`, id: id }, fetcher);
    return {
        subscriptions: data,
        error,
        isLoading,
        mutate
    };
}


function usePackages(id: string) {
    const { data, error, isLoading, mutate } = useSWR<MemberPlan[]>({ url: `plans/pkgs`, id: id }, fetcher);
    return {
        packages: data,
        error,
        isLoading,
        mutate
    };
}



function useMemberPlans(id: string) {
    const { data, error, isLoading } = useSWR({ url: `plans`, id: id }, fetcher);

    return {
        plans: data,
        error,
        isLoading,
    };
}

function useMemberPlan(id: string, planId: number) {
    const { data, error, isLoading } = useSWR({ url: `plans/standard/${planId}`, id: id }, fetcher);

    return {
        plan: data,
        error,
        isLoading,
    };
}



export {
    useSubscriptions,
    usePackages,
    useMemberPlans,
    useMemberPlan
}
