import useSWR from "swr";
import { fetcher } from "./hooks";
import { StaffLocation } from "@subtrees/types";




function useStaffLocations(locationId: string) {
  const { data, error, isLoading, mutate } = useSWR<StaffLocation[]>(
    { url: `staffs`, id: locationId },
    fetcher
  );


  return {
    sls: data ?? [],
    error,
    isLoading,
    mutate
  };
}

export { useStaffLocations };
