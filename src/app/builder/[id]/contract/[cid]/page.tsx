'use client';
import { use } from "react";
import ContractEditor from './contract-editor'
import { useContract } from '@/hooks/use-contracts'

export default function ContractBuilder(props: { params: Promise<{ cid: string, id: string }> }) {
    const params = use(props.params);
    const { contract, isLoading } = useContract(params.id, parseInt(params.cid))
	console.log(contract);
    if (!isLoading && !contract) {
        return <div className='h-screen w-full bg-background text-center'>Contract not found</div>
    }

    if (isLoading) {
        return <div className='h-screen w-full bg-background text-center'>Loading Contract</div>
    }

    return (
        <div className='flex h-screen w-full bg-background'>
            {contract && <ContractEditor contractRef={contract} locationId={params.id} />}
        </div>
    )
}
