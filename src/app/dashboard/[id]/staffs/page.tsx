
'use client';
import { use } from "react";

import ErrorComponent from "@/components/error"
import SectionLoading from "../../../../components/section-loading"
import { useStaffs } from "@/hooks/use-staffs"
import { StaffList } from "./components"


interface StaffsPageProps {
    params: Promise<{
        id: string
    }>
}

export default function StaffsPage(props: StaffsPageProps) {
    const params = use(props.params);
    const { staffs, isLoading, error } = useStaffs(params.id)
    if (error) {
        return (
            <ErrorComponent error={error} />
        )
    }

    return (
        <div className='max-w-4xl  py-4 m-auto'>
            <div className='border-b py-4 mb-4'>
                <h4 className='text-xl font-bold'>Staffs</h4>
            </div>

            {isLoading ? (<SectionLoading />) : (<StaffList staffs={staffs} locationId={params.id} />)}
        </div>
    )
}




