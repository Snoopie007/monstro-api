import useSWR from "swr";
import { fetcher, newfetcher } from "./hooks";



function useCalendarEvents(id: string, date: string) {
    const { data, error, isLoading } = useSWR([`events`, id, `?date=${date}`], newfetcher);
    return {
        events: data,
        error,
        isLoading,
    };
}




export { useCalendarEvents };
