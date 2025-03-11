'use client';
import { use } from "react";
import ContractEditor from './ContractEditor'
import { useContract } from '@/hooks/useContracts'

import SectionLoader from '@/components/section-loading'
export default function ContractBuilder(props: { params: Promise<{ cid: string, id: string }> }) {
    const params = use(props.params);
    const { contract, isLoading } = useContract(params.id, parseInt(params.cid))

    if (!isLoading && !contract) {
        return <div className='h-screen w-full bg-background text-center'>Contract not found</div>
    }

    if (isLoading) {
        return <SectionLoader />
    }

    return (
        <div className='flex h-screen w-full bg-background'>
            {contract && <ContractEditor contractRef={contract} locationId={params.id} />}
        </div>
    )
}
