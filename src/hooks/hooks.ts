import { MemberAchievement } from "@subtrees/types";
import useSWR from "swr";

async function fetcher(data: { url: string; id: string; query?: string }) {
	const res = await fetch(
		`/api/protected/loc/${data.id}/${data.url}${data.query ? `?${data.query}` : ""
		}`, {
		headers: {
			"X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
	}
	);
	if (!res.ok) {
		throw new Error("An error occurred while fetching the data.");
	}

	return await res.json();
}

function useMembers(
	id: string,
	query: string = "",
	page: number = 1,
	size: number = 15,
	tags: string[] = [],
	tagOperator: "AND" | "OR" = "OR",
	columnFilters: any[] = []
) {
	const tagsParam = tags.length > 0 ? `&tags=${tags.join(",")}` : "";
	const tagOperatorParam = tags.length > 0 ? `&tagOperator=${tagOperator}` : "";
	const columnFiltersParam = columnFilters.length > 0
		? `&columnFilters=${encodeURIComponent(JSON.stringify(columnFilters))}`
		: "";

	const { data, error, isLoading } = useSWR(
		{
			url: `members?query=${query}&page=${page}&size=${size}${tagsParam}${tagOperatorParam}${columnFiltersParam}`,
			id: id,
		},
		fetcher
	);

	return {
		data,
		error,
		isLoading,
	};
}

function useMemberTransactions(id: string, mid: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `members/${mid}/transactions`, id: id },
		fetcher
	);
	return {
		transactions: data,
		error,
		isLoading,
		mutate,
	};
}
function useMemberAchievements(id: string, mid: string) {
	const { data, error, isLoading } = useSWR<MemberAchievement[]>(
		{ url: `members/${mid}/achievements`, id: id },
		fetcher
	);
	return {
		mas: data,
		error,
		isLoading,
	};
}

function useMemberPrograms(id: string, mid: string) {
	const { data, error, isLoading } = useSWR(
		{ url: `members/${mid}/programs`, id: id },
		fetcher
	);
	return {
		programs: data,
		error,
		isLoading,
	};
}

function useIntegrations(id: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `integrations/`, id: id },
		fetcher
	);
	return {
		integrations: data,
		error,
		isLoading,
		mutate,
	};
}

function useAchievements(id: string) {
	const { data, error, isLoading } = useSWR(
		{ url: `achievements`, id: id },
		fetcher
	);

	return {
		achievements: data,
		error,
		isLoading,
	};
}

function useAchievement(id: string, aid: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `achievements/${aid}`, id: id },
		fetcher
	);

	return {
		achievement: data,
		error,
		isLoading,
		mutate,
	};
}

function useWallet(id: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `config/wallet`, id: id },
		fetcher
	);
	return {
		wallet: data,
		error,
		isLoading,
		mutate,
	};
}

function useMemberSubscriptions(id: string, mid: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `members/${mid}/subs`, id: id },
		fetcher
	);

	return {
		subs: data,
		mutate,
		error,
		isLoading,
	};
}

function useMemberPackages(id: string, mid: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `members/${mid}/pkgs`, id: id },
		fetcher
	);
	return {
		packages: data,
		error,
		isLoading,
		mutate,
	};
}

function useMemberInvoices(id: string, mid: string) {
	const { data, error, isLoading, mutate } = useSWR(
		{ url: `members/${mid}/invoices`, id: id },
		fetcher
	);
	return {
		invoices: data,
		error,
		isLoading,
		mutate,
	};
}

export {
	fetcher, useAchievement,
	useAchievements, useIntegrations, useMemberAchievements, useMemberInvoices, useMemberPackages, useMemberPrograms, useMembers, useMemberSubscriptions, useMemberTransactions, useWallet
};

