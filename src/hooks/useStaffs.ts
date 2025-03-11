
import useSWR from "swr";
import { fetcher } from "./hooks";



function useStaffs(locationId: string) {
    const { data, error, isLoading } = useSWR({ url: `staffs`, id: locationId }, fetcher);

    return {
        staffs: data,
        error,
        isLoading,
    };
}

export { useStaffs };
