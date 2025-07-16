import useSWR from "swr";
import { fetcher } from "./hooks";

interface UseCalendarEventsParams {
  id: string;
  startDate: string;
  endDate: string;
}

function useCalendarEvents({
  id,
  startDate,
  endDate,
}: UseCalendarEventsParams) {
  const query = `startDate=${startDate}&endDate=${endDate}`;
  const { data, error, isLoading, mutate } = useSWR(
    id ? { url: `events`, id: id, query: query } : null,
    fetcher
  );
  return {
    events: data,
    error,
    isLoading,
    mutate,
  };
}

export { useCalendarEvents };
