import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MemberPlan } from "@/types/member";

async function fetchPlans(url: string): Promise<MemberPlan[]> {
  const res = await fetch(url, {
    headers: {
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  if (!res.ok) {
    throw new Error("An error occurred while fetching the data.");
  }
  return await res.json();
}

function useSubscriptions(id: string, archived: boolean = false) {
  const queryClient = useQueryClient();
  const url = `/api/protected/loc/${id}/plans/subs?archived=${archived}`;

  const { data, error, isLoading } = useQuery<MemberPlan[]>({
    queryKey: ["subscriptions", id, archived],
    queryFn: () => fetchPlans(url),
    enabled: !!id,
  });

  const mutate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions", id, archived] });
  };

  return {
    subscriptions: data,
    error,
    isLoading,
    mutate,
  };
}

function usePackages(id: string, archived: boolean = false) {
  const queryClient = useQueryClient();
  const url = `/api/protected/loc/${id}/plans/pkgs?archived=${archived}`;

  const { data, error, isLoading } = useQuery<MemberPlan[]>({
    queryKey: ["packages", id, archived],
    queryFn: () => fetchPlans(url),
    enabled: !!id,
  });

  const mutate = () => {
    queryClient.invalidateQueries({ queryKey: ["packages", id, archived] });
  };

  return {
    packages: data,
    error,
    isLoading,
    mutate,
  };
}

function useMemberPlans(id: string) {
  const url = `/api/protected/loc/${id}/plans`;

  const { data, error, isLoading } = useQuery({
    queryKey: ["memberPlans", id],
    queryFn: () => fetchPlans(url),
    enabled: !!id,
  });

  return {
    plans: data,
    error,
    isLoading,
  };
}

function useMemberPlan(id: string, planId: number) {
  const url = `/api/protected/loc/${id}/plans/standard/${planId}`;

  const { data, error, isLoading } = useQuery({
    queryKey: ["memberPlan", id, planId],
    queryFn: () => fetchPlans(url),
    enabled: !!id && !!planId,
  });

  return {
    plan: data,
    error,
    isLoading,
  };
}

export { useSubscriptions, usePackages, useMemberPlans, useMemberPlan };
