import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useAchievements(id: string) {
  const { data, error, isLoading } = useSWR({url: `achievements`, id: id}, fetcher);

  return {
    achievements: data,
    error,
    isLoading,
  };
}

function useAchievement(id: string, aid: number) {
  const { data, error, isLoading, mutate } = useSWR({url: `achievements/${aid}`, id: id}, fetcher);

  return {
    achievement: data,
    error,
    isLoading,
    mutate,
  };
}

export { useAchievement, useAchievements };
