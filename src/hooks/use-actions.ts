import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useActions(id: string) {
	const { data, error, isLoading } = useSWR(
		{url: `achievements/actions`, id: id},
		fetcher,
	);

	return {
		actions: data,
		error,
		isLoading,
	};
}

export { useActions };
