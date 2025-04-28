'use client'
import { useProgram } from '@/hooks/usePrograms';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import React, { use } from 'react';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import UpdateProgram from './components/UpdateProgram';
import { ProgramMembers } from './components/ProgramMembers';
import ProgramPlans from './components/ProgramPlans/ProgramPlanList';


import LoadingComponent from '@/components/loading';
import ErrorComponent from '@/components/error';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { ProgramSessions } from './components/ProgramSessions';

export default function Program(props: { params: Promise<{ id: string, pid: number }> }) {
    const params = use(props.params);
    const { program, error, isLoading } = useProgram(params.id, params.pid);

    if (error) { return (<ErrorComponent error={error} />) }

    if (isLoading) { return (<LoadingComponent />) }

    if (program) {
        return (
            <div className="m-auto grid grid-cols-10 h-full ">

                <div className='col-span-3 border-r border-foreground/10 '>
                    <Card className='border-none'>
                        <CardHeader className="p-0">
                            <div className="border-b flex flex-row justify-between ">
                                <div className="flex-initial flex flex-row items-center px-4">
                                    <span className='text-sm font-semibold'> Program Overview</span>
                                </div>
                                <div className="flex-1 flex flex-row items-center justify-end ">
                                    <div className="flex ">
                                        <UpdateProgram programId={program.id} locationId={params.id} />
                                    </div>

                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className='p-4'>
                            <div className="flex flex-col ">
                                <div className="flex flex-row gap-4 items-start">
                                    <Avatar className="flex items-center justify-center text-black w-[45px] h-[45px]  bg-white/50">
                                        <AvatarImage className="rounded-full " src={program.avatar} />
                                        <AvatarFallback className=" bg-gray-200 text-gray-400 text-lg font-black">
                                            {program.name.charAt(0)}
                                        </AvatarFallback>

                                    </Avatar>
                                    <div className='space-y-1'>
                                        <div className='text-foreground text-base font-semibold'> {program.name}</div>
                                        <p className=" text-muted-foreground text-sm">
                                            {program.description}
                                        </p>

                                    </div>

                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <ProgramSessions sessions={program.sessions} pid={params.pid} lid={params.id} />
                </div>

                <div className="col-span-7">
                    <ProgramMembers programId={program.id} locationId={params.id} />
                </div>
            </div>
        )
    }
}
