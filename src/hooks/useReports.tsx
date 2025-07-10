import useSWR from "swr";
import { fetcher } from "./hooks";
import { UseReportResult, ReportData } from "@/types/reports";
import { useMemo } from "react";

interface UseReportParams {
  locationId: string;
  startDate?: Date;
  endDate?: Date;
}

function useReport({
  locationId,
  startDate,
  endDate,
}: UseReportParams): UseReportResult {
  // Create a stable query string using useMemo to prevent unnecessary re-fetches
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (startDate) {
      params.append("startDate", startDate.toISOString().split("T")[0]);
    }

    if (endDate) {
      params.append("endDate", endDate.toISOString().split("T")[0]);
    }

    return params.toString();
  }, [startDate, endDate]);

  // Create a stable SWR key
  const swrKey = useMemo(() => {
    const baseUrl = "reports";
    return queryString
      ? { url: `${baseUrl}?${queryString}`, id: locationId }
      : { url: baseUrl, id: locationId };
  }, [queryString, locationId]);

  const { data, error, isLoading, mutate } = useSWR<ReportData>(
    swrKey,
    fetcher
  );

  // Memoize the return value to prevent unnecessary re-renders
  const result = useMemo(
    () => ({
      reports: data,
      error,
      isLoading,
      refetch: () => mutate(),
    }),
    [data, error, isLoading, mutate]
  );

  return result;
}

// Legacy function for backward compatibility
function useReportLegacy(id: string) {
  return useReport({ locationId: id });
}

export { useReport, useReportLegacy };
