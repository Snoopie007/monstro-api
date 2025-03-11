
import useSWR from "swr";
import { fetcher } from "./hooks";

function usePrograms(id: string) {
  const { data, error, isLoading } = useSWR({ url: `programs?page=1`, id: id }, fetcher);

  return {
    data,
    error,
    isLoading,
  };
}

function useProgram(id: string, pid: number) {
  const { data, error, isLoading, mutate } = useSWR({ url: `programs/${pid}`, id: id }, fetcher);

  return {
    program: data,
    error,
    isLoading,
    mutate,
  };
}
function useProgramMembers(id: string, programId: number) {
  const { data, error, isLoading, mutate } = useSWR({ url: `programs/${programId}/members/`, id: id }, fetcher,);
  return {
    members: data,
    error,
    isLoading,
    mutate,
  };
}

export { useProgram, usePrograms, useProgramMembers };
