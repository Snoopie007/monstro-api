import { useQuery } from "@tanstack/react-query";
import type { ClosedDate } from "@/types";

export type { ClosedDate };

interface UseCalendarClosuresParams {
  locationId: string;
  startDate: string;
  endDate: string;
}

async function fetchClosures(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<ClosedDate[]> {
  const res = await fetch(
    `/api/protected/loc/${locationId}/closures/calendar?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch closures");
  }

  return res.json();
}

function useCalendarClosures({
  locationId,
  startDate,
  endDate,
}: UseCalendarClosuresParams) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["closures", locationId, startDate, endDate],
    queryFn: () => fetchClosures(locationId, startDate, endDate),
    enabled: !!locationId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    closures: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export { useCalendarClosures };
