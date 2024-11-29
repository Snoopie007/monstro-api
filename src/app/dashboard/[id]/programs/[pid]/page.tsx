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
import UpdateProgram from './components/update-program';
import { ProgramLevels } from './components/ProgramLevels';
import { ProgramMembers } from './components/ProgramMembers';
import ProgramPlans from './components/ProgramPlans/program-plans';
import Link from 'next/link';

import useSWR from 'swr';

import LoadingComponent from '@/components/loading';
import ErrorComponent from '@/components/error';

export default function Program(props: { params: Promise<{ id: string, pid: number }> }) {
    const params = use(props.params);
    const { program, error, isLoading } = useProgram(params.id, params.pid);
    const { mutate } = useSWR(`/api/protected/${params.id}/programs/${params.pid}`);

    if (error) { return (<ErrorComponent error={error} />) }

    if (isLoading) { return (<LoadingComponent />) }

    if (program) {
        return (
            <div className="m-auto p-5 grid grid-cols-10 gap-4">
                <div className='col-span-3'>
                    <div className=" mb-4 w-full   overflow-hidden border rounded-sm">
                        <div className="border-b flex flex-row justify-between ">
                            <div className="flex-initial flex flex-row items-center px-4">
                                <button onClick={() => { }} className="group" >
                                    <ArrowLeft size={18} className="stroke-gray-300 group-hover:stroke-black" />
                                </button>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-end ">
                                <div className="flex ">
                                    <UpdateProgram programId={program.id} locationId={params.id} />
                                </div>

                            </div>
                        </div>
                        <div className="flex flex-row  gap-6 w-full py-5 px-3">
                            <div className="">
                                <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-16 h-16 bg-white/50">
                                    <AvatarImage className="w-full h-full rounded-full border" src={program.avatar} />
                                    <AvatarFallback className="  bg-gray-200 text-gray-400 text-4xl font-bold">
                                        {program.name.charAt(0)}
                                    </AvatarFallback>
                                    <div className="absolute align-middle file-upload flex h-full hover:opacity-100 items-center justify-center opacity-0 w-full text-3xl">


                                    </div>
                                </Avatar>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className='flex flex-col gap-4'>
                                    <div className="text-sm ">
                                        <strong>Name</strong>
                                        <div className='text-gray-400 '> {program.name}</div>
                                    </div>

                                    <div className="text-sm ">
                                        <strong>Description</strong>
                                        <p className=" text-gray-400 font-roboto">
                                            {program.description}
                                        </p>
                                    </div>

                                </div>
                                <div className='grid grid-cols-3 '>
                                    <div className="text-sm  py-2">
                                        <strong>
                                            Total Enrolled
                                        </strong>
                                        <div className='text-gray-400 '>
                                            {program.memberCount}
                                        </div>
                                    </div>
                                    <div className="text-sm  py-2">
                                        <strong>
                                            Total Active
                                        </strong>
                                        <div className='text-gray-400 '>
                                            {0}
                                        </div>
                                    </div>
                                    <div className="text-sm py-2">
                                        <strong>
                                            Retention Rate
                                        </strong>
                                        <div className='text-gray-400 '>
                                            {0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className='mb-4'>
                        <ProgramLevels levels={program.levels} programId={params.pid} locationId={params.id} />
                    </div>
                </div>

                <div className="col-span-7">
                    <Tabs defaultValue="members" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">

                            {["members", "plans"].map((tab) => (
                                <TabsTrigger key={tab} value={tab} className='capitalize'>{tab}</TabsTrigger>
                            ))}

                        </TabsList>

                        <TabsContent value="members" className='p-0'>
                            <ProgramMembers programId={program.id} locationId={params.id} />
                        </TabsContent>

                        <TabsContent value="plans">
                            <ProgramPlans
                                programPlans={program.plans}
                                programId={params.pid}
                                vendorId={program.vendorId}
                                locationId={params.id}
                            />
                        </TabsContent>

                    </Tabs>
                </div>
            </div>
        )
    }
}
