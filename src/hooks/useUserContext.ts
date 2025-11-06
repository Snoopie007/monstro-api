// src/hooks/useUserContext.ts (NEW FILE)
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useUserContext() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/auth/user/context",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    userContext: data,
    isLoading,
    error,
    refresh: mutate, // Can manually refresh when needed
  };
}