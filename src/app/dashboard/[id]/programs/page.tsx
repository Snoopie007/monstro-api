'use client';
import { use } from "react";

import { usePrograms } from '@/hooks/use-programs'
import { AddProgram, ProgramList } from './components'
import ErrorComponent from '@/components/error'
import SectionLoader from '@/components/section-loading'

export default function Programs(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { data, isLoading, error } = usePrograms(params.id)
    if (error) {
        return (
            <ErrorComponent error={error} />
        )
    }

    return (
        <div className='max-w-4xl  py-4 m-auto'>
            <div className='border-b py-4 mb-4'>
                <h4 className='text-xl font-bold'>Programs</h4>
            </div>
            <div className="mb-3">
                <div className='flex flex-row gap-4 items-center py-3'>
                    <input placeholder='Search programs' className='w-full rounded-sm border-gray-200 text-sm bg-transparent  py-2.5  px-4 border ' />
                    <AddProgram />
                </div>
            </div>
            {isLoading ? (<SectionLoader />) : (<ProgramList programs={data} locationId={params.id} />)}
        </div>

    )
}
