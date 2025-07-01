
import useSWR from "swr";




async function fetcher(data: { url: string, id: string, query?: string }) {
    const res = await fetch(`/api/protected/loc/${data.id}/${data.url}${data.query ? `?${data.query}` : ""}`);
    if (!res.ok) {
        throw new Error("An error occurred while fetching the data.");
    }

    return await res.json();
}



function useMembers(id: string, query: string = "", page: number = 1, size: number = 15) {
    const { data, error, isLoading } = useSWR({ url: `members?query=${query}&page=${page}&size=${size}`, id: id }, fetcher);

    return {
        data,
        error,
        isLoading,
    };
}

function useMemberTransactions(id: string, mid: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `members/${mid}/transactions`, id: id }, fetcher);
    return {
        transactions: data,
        error,
        isLoading,
        mutate,
    };
}
function useMemberAchievements(id: string, mid: string) {
    const { data, error, isLoading } = useSWR({ url: `members/${mid}/achievements`, id: id }, fetcher);
    return {
        achievements: data,
        error,
        isLoading,
    };
}

function useAttedance(id: string, mid: string) {
    const { data, error, isLoading } = useSWR({ url: `members/${mid}/attendances`, id: id }, fetcher);
    return {
        attendances: data,
        error,
        isLoading,
    };
}

function useMemberPrograms(id: string, mid: string) {
    const { data, error, isLoading } = useSWR({ url: `members/${mid}/programs`, id: id }, fetcher);
    return {
        programs: data,
        error,
        isLoading,
    };
}

function useIntegrations(id: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `integrations/`, id: id }, fetcher);
    return {
        integrations: data,
        error,
        isLoading,
        mutate,
    };
}

function useAchievements(id: string) {
    const { data, error, isLoading } = useSWR({ url: `achievements`, id: id }, fetcher);

    return {
        achievements: data,
        error,
        isLoading,
    };
}

function useAchievement(id: string, aid: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `achievements/${aid}`, id: id }, fetcher);

    return {
        achievement: data,
        error,
        isLoading,
        mutate,
    };
}

function useActions(id: string) {
    const { data, error, isLoading } = useSWR(
        { url: `achievements/actions`, id: id },
        fetcher,
    );

    return {
        actions: data,
        error,
        isLoading,
    };
}
function useWallet(id: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `vendor/wallet`, id: id }, fetcher);
    return {
        wallet: data,
        error,
        isLoading,
        mutate
    };
}

function useMemberPackages(id: string, mid: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `members/${mid}/packages`, id: id }, fetcher);
    return {
        packages: data,
        error,
        isLoading,
        mutate
    };
}

function useMemberInvoices(id: string, mid: string) {
    const { data, error, isLoading, mutate } = useSWR({ url: `members/${mid}/invoices`, id: id }, fetcher);
    return {
        invoices: data,
        error,
        isLoading,
        mutate
    };
}


export {
    fetcher,
    useMembers,
    useMemberAchievements,
    useAttedance,
    useMemberPrograms,
    useMemberTransactions,
    useIntegrations,
    useAchievement,
    useAchievements,
    useWallet,
    useMemberPackages,
    useActions,
    useMemberInvoices,
};
