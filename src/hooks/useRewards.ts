
import useSWR from "swr";
import { fetcher } from "./hooks";

function useRewards(id: string) {
	const { data, error, isLoading, mutate } = useSWR({ url: `rewards`, id: id }, fetcher);

	return {
		rewards: data,
		error,
		isLoading,
		mutate,
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
