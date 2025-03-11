
import useSWR from "swr";
import { fetcher } from "./hooks";

function usePlans(id: string, programId: string) {
	const { data, error, isLoading } = useSWR({ url: `plans/programs/${programId}`, id: id }, fetcher);

	return {
		plans: data,
		error,
		isLoading,
	};
}

function usePlan(id: string, planId: number) {
	const { data, error, isLoading } = useSWR({ url: `plans/single/${planId}`, id: id }, fetcher);

	return {
		plan: data,
		error,
		isLoading,
	};
}

export { usePlan, usePlans };
