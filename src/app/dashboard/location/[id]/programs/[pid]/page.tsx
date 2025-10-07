'use client'
import { useProgram } from '@/hooks/usePrograms';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import React, { use } from 'react';

import { UpdateProgram, ProgramMembers } from './components';

import LoadingComponent from '@/components/loading';
import ErrorComponent from '@/components/error';
import { Card, CardContent, CardHeader } from '@/components/ui';
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
                    <Card className='border-none'>
                        <CardHeader className="px-4 pt-4 pb-2 flex flex-row justify-between">
                            <div className="flex-initial flex flex-row items-center gap-2">
                                <Avatar className="flex items-center justify-center text-black size-6 bg-foreground/5">
                                    <AvatarImage className="rounded-full " src={program.avatar} />
                                    <AvatarFallback className=" bg-gray-200 text-muted-foreground text-base font-black">
                                        {program.name.charAt(0)}
                                    </AvatarFallback>

                                </Avatar>
                                <div className='text-foreground text-sm font-semibold'> {program.name}</div>
                            </div>
                            {canEditProgram && <UpdateProgram pid={program.id} lid={params.id} availableStaff={staffs} />}
                        </CardHeader>
                        <CardContent className='px-4'>
                            <p className=" text-muted-foreground text-sm">
                                {program.description}
                            </p>
                        </CardContent>
                    </Card>
                    <ProgramSessions availableStaff={staffs} programAssignedStaff={program.instructor} editable={canEditProgram} sessions={program.sessions} pid={params.pid} lid={params.id} />
                </div>

                <div className="col-span-7">
                    <ProgramMembers programId={program.id} locationId={params.id} />
                </div>
            </div>
        )
    }
}
