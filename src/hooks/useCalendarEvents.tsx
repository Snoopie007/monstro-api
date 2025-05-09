import useSWR from "swr";
import { fetcher } from "./hooks";



function useCalendarEvents(id: string, date: string) {
    const { data, error, isLoading } = useSWR({ url: `events?date=${date}`, id: id }, fetcher);
    return {
        events: data,
        error,
        isLoading,
    };
}




export { useCalendarEvents };
