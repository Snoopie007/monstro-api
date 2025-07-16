import useSWR from "swr";
import { fetcher } from "./hooks";

interface UseCalendarEventsParams {
  id: string;
  startDate: string;
  endDate: string;
  planIds?: string[]; // Optional plan IDs for filtering
}

function useCalendarEvents({
  id,
  startDate,
  endDate,
  planIds,
}: UseCalendarEventsParams) {
  // Build query string with optional planIds
  let query = `startDate=${startDate}&endDate=${endDate}`;
  if (planIds && planIds.length > 0) {
    query += `&planIds=${planIds.join(",")}`;
  }

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
