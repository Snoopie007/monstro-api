import { fetcher } from "@/libs/api";
import useSWR from "swr";

function useIntegrations(id: string) {
  const { data, error, isLoading } = useSWR({ url: `integrations/`, id: id }, fetcher);
  return {
    integrations: data,
    error,
    isLoading,
  };
}

export { useIntegrations };
