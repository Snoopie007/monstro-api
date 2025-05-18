import useSWR from "swr";
import { fetcher } from "./hooks";



function useCalendarEvents(id: string, date: string) {
    const { data, error, isLoading } = useSWR([`events`, id, `?date=${date}`], fetcher);
    return {
        events: data,
        error,
        isLoading,
    };
}




export { useCalendarEvents };
