'use client'
import { useProgram } from '@/hooks/usePrograms';
import React, { use } from 'react';


import LoadingComponent from '@/components/loading';
import ErrorComponent from '@/components/error';
import { ProgramSessions } from './components/ProgramSessions';
import { useStaffs } from "@/hooks/useStaffs";
import { usePermission } from '@/hooks/usePermissions';

export default function Program(props: { params: Promise<{ id: string, pid: string }> }) {
    const params = use(props.params);
    const canEditProgram = usePermission("edit program", params.id);
    const { program, error, isLoading } = useProgram(params.id, params.pid);
    const { staffs, error: staffsError, isLoading: staffsLoading } = useStaffs(params.id);

    if (error || staffsError) { return (<ErrorComponent error={error || staffsError} />) }

    if (isLoading || staffsLoading) { return (<LoadingComponent />) }

    if (program) {
        return (
            <div className="m-auto grid grid-cols-10 h-full ">

                <div className='col-span-3 border-r border-foreground/10 '>

                    <ProgramSessions availableStaff={staffs} programAssignedStaff={program.instructor} editable={canEditProgram} sessions={program.sessions} pid={params.pid} lid={params.id} />
                </div>


            </div>
        )
    }
}
