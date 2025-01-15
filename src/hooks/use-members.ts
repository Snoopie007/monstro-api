import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useMembers(id: string, query: string = "", page: number = 1, size: number = 15) {
	const { data, error, isLoading } = useSWR({ url: `members?query=${query}&page=${page}&size=${size}`, id: id }, fetcher);

	return {
		data,
		error,
		isLoading,
	};
}

function useMemberSubscriptions(id: string, mid: number, customerId: string | undefined) {

	if (!customerId) return { subscriptions: [], error: { message: "No Customer ID" }, isLoading: false };
	const { data, error, isLoading } = useSWR({ url: `members/${mid}/subscriptions?customerId=${customerId}`, id: id }, fetcher);
	return {
		subscriptions: data,
		error,
		isLoading,
	};
}

function useMemberAchievements(id: string, mid: number) {
	const { data, error, isLoading } = useSWR({ url: `members/${mid}/achievements`, id: id }, fetcher);
	return {
		achievements: data,
		error,
		isLoading,
	};
}


function useMemberPayments(id: string, mid: number, customerId: string | undefined) {
	if (!customerId) return { payments: [], error: { message: "No Customer ID" }, isLoading: false };
	const { data, error, isLoading } = useSWR({ url: `members/${mid}/payments?customerId=${customerId}`, id: id }, fetcher);
	return {
		payments: data,
		error,
		isLoading,
	};
}





function useAttedance(id: string, mId: number) {
	const { data, error, isLoading } = useSWR({ url: `members/${mId}/attendances`, id: id }, fetcher);
	return {
		attendances: data,
		error,
		isLoading,
	};
}

export {
	useMembers,
	useMemberAchievements,
	useAttedance,
	useMemberPayments,
	useMemberSubscriptions,
};
