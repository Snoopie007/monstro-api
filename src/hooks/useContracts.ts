import useSWR from "swr";
import { fetcher } from "./hooks";
import { Contract } from "@/types";


function useContracts(id: string, withDraft: boolean = true) {
	const { data, error, isLoading } = useSWR<Contract[]>({ url: `contracts?withDraft=${withDraft}`, id: id }, fetcher);
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


function useContract(id: string, cid: string) {
	const { data, error, isLoading } = useSWR({ url: `contracts/${cid}`, id: id }, fetcher,);

	return {
		contract: data,
		error,
		isLoading,
	};
}

export { useContracts, useContract, useSignedContracts };
