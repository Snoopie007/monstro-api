import useSWR from "swr";
import { fetcher } from "./hooks";

export const useBot = (id: string, bid: number) => {
    const { data: bot, isLoading, error, mutate } = useSWR({ url: `/bots/${bid}`, id }, fetcher);
    return {
        bot,
        mutate,
        isLoading,
        error
    };
};

export const useBots = (id: string) => {

    const { data: bots, isLoading, mutate, error } = useSWR({ url: `/bots`, id }, fetcher);

    return {
        bots,
        isLoading,
        mutate,
        error
    };
};