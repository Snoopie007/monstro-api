


import { fetcher } from "@/libs/api";
import useSWR from "swr";



function useStaffs(locationId: string) {
    const { data, error, isLoading } = useSWR({url: `staffs`, id: locationId}, fetcher);

    return {
        staffs: data,
        error,
        isLoading,
    };
}

export { useStaffs };
