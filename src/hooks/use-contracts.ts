import { fetcher } from "@/libs/api";
import useSWR from "swr";


function useContracts(id: string) {
  const { data, error, isLoading } = useSWR({ url: `contracts`, id: id }, fetcher,);

  return {
    contracts: data,
    error,
    isLoading,
  };
}

function useSignedContracts(id: string) {
  const { data, error, isLoading } = useSWR({ url: `contracts/signed`, id: id }, fetcher);
  return {
    contracts: data,
    error,
    isLoading,
  };
}

function useContractsByLocationId(id: string, withDraft: boolean = true) {
  const { data, error, isLoading } = useSWR({ url: `contracts?withDraft=${withDraft}`, id: id }, fetcher);
  return {
    contracts: data,
    error,
    isLoading,
  };
}

function useContract(id: string, cId: number) {
  const { data, error, isLoading } = useSWR({ url: `contracts/${cId}`, id: id }, fetcher,);

  return {
    contract: data,
    error,
    isLoading,
  };
}

export { useContracts, useContract, useSignedContracts, useContractsByLocationId };
