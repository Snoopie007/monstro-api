
import useSWR from "swr";
import { fetcher } from "./hooks";

function usePrograms(id: string) {
	const { data, error, isLoading, mutate } = useSWR({ url: `programs?page=1`, id: id }, fetcher);

	return {
		data,
		error,
		isLoading,
		mutate,
	};
}

function useProgram(id: string, pid: string) {
	const { data, error, isLoading, mutate } = useSWR({ url: `programs/${pid}`, id: id }, fetcher);

	return {
		program: data,
		error,
		isLoading,
		mutate,
	};
}

function useProgramMembers(id: string, pid: string) {
	const { data, error, isLoading, mutate } = useSWR({ url: `programs/${pid}/members/`, id: id }, fetcher,);
	return {
		members: data,
		error,
		isLoading,
		mutate,
	};
}

export { useProgram, usePrograms, useProgramMembers };
