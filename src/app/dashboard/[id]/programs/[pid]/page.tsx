'use client'
import { useProgram } from '@/hooks/use-programs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import React, { useState, use } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import UpdateProgram from './components/UpdateProgram';
import { ProgramLevels } from './components/ProgramLevels';
import { ProgramMembers } from './components/ProgramMembers';
import ProgramPlans from './components/ProgramPlans/ProgramPlan';
import useSWR from 'swr';

import LoadingComponent from '@/components/loading';
import ErrorComponent from '@/components/error';
import { Card, CardContent, CardHeader } from '@/components/ui';

export default function Program(props: { params: Promise<{ id: string, pid: number }> }) {
    const params = use(props.params);
    const { program, error, isLoading } = useProgram(params.id, params.pid);
    const { mutate } = useSWR(`/api/protected/${params.id}/programs/${params.pid}`);

    if (error) { return (<ErrorComponent error={error} />) }

    if (isLoading) { return (<LoadingComponent />) }

    if (program) {
        return (
            <div className="m-auto p-5 grid grid-cols-10 gap-4 ">

                <div className='col-span-3 space-y-4'>
                    <Card>
                        <CardHeader className="p-0">
                            <div className="border-b flex flex-row justify-between ">
                                <div className="flex-initial flex flex-row items-center px-4">

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
                                <div className="flex flex-row gap-3 items-center">
                                    <Avatar className="flex items-center justify-center text-black-100 w-[45px] h-[45px]  bg-white/50">
                                        <AvatarImage className="rounded-full " src={program.avatar} />
                                        <AvatarFallback className=" bg-gray-200 text-gray-400 text-lg font-black">
                                            {program.name.charAt(0)}
                                        </AvatarFallback>

                                    </Avatar>
                                    <div className='space-y-0'>
                                        <div className='text-foreground text-sm font-semibold'> {program.name}</div>
                                        <p className=" text-foreground/80 text-xs font-roboto">
                                            {program.description}
                                        </p>

                                    </div>

                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className='mb-4'>
                        <ProgramLevels levels={program.levels} programId={params.pid} locationId={params.id} />
                    </div>
                </div>

                <div className="col-span-7">
                    <Tabs defaultValue="members" className="w-full">
                        <TabsList className='bg-foreground/10 rounded-sm  h-auto'>
                            {["members", "subscriptions & packages"].map((tab) => (
                                <TabsTrigger key={tab} value={tab} className='capitalize'>
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="members" >
                            <ProgramMembers programId={program.id} locationId={params.id} />
                        </TabsContent>
                        <TabsContent value="subscriptions & packages">
                            <ProgramPlans programPlans={program.plans} programId={params.pid} vendorId={program.vendorId} locationId={params.id} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        )
    }
}
