import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useRewards(id: string) {
	const { data, error, isLoading } = useSWR({ url: `rewards`, id: id }, fetcher);

	return {
		rewards: data,
		error,
		isLoading,
	};
}

function useReward(id: string, rId: number) {
	const { data, error, isLoading, mutate } = useSWR({ url: `rewards/${rId}`, id: id }, fetcher);

	return {
		reward: data,
		error,
		isLoading,
		mutate,
	};
}

export { useReward, useRewards };
