import useSWR from "swr";
import { fetcher } from "./hooks";
import { useMemo } from "react";
import { Transaction, MemberLocation } from "@subtrees/types";

interface UseReportParams {
	lid: string;
	startDate?: Date;
	endDate?: Date;
}

type ReportData = {
	transactions: Transaction[];
	mls: MemberLocation[];
}

type ReportResult = {
	transactions: Transaction[];
	mls: MemberLocation[];
	isLoading: boolean;
	error: any;
	refetch: () => void;
}

function useReport({
	lid,
	startDate,
	endDate,
}: UseReportParams): ReportResult {
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
		return queryString ? { url: `${baseUrl}?${queryString}`, id: lid } : { url: baseUrl, id: lid };
	}, [queryString, lid]);

	const { data, error, isLoading, mutate } = useSWR<ReportData>(
		swrKey,
		fetcher
	);

	// Memoize the return value to prevent unnecessary re-renders
	const result = useMemo(
		() => ({
			transactions: data?.transactions || [],
			mls: data?.mls || [],
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
	return useReport({ lid: id });
}

export { useReport, useReportLegacy };
