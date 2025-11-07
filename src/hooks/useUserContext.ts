// src/hooks/useUserContext.ts (NEW FILE)
"use client";

import { useQuery } from "@tanstack/react-query";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useUserContext() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user/context"],
    queryFn: () => fetcher("/api/auth/user/context"),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    userContext: data,
    isLoading,
    error,
    refresh: refetch, // Can manually refresh when needed
  };
}