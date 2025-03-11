import useSWR from "swr";
import { fetcher } from "./hooks";



function useContracts(id: string, withDraft: boolean = true) {
	const { data, error, isLoading } = useSWR({ url: `contracts?withDraft=${withDraft}`, id: id }, fetcher);
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


function useContract(id: string, cId: number) {
	const { data, error, isLoading } = useSWR({ url: `contracts/${cId}`, id: id }, fetcher,);

	return {
		contract: data,
		error,
		isLoading,
	};
}

export { useContracts, useContract, useSignedContracts };
