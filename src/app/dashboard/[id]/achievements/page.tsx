'use client'
import React, { use } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAchievements } from '@/hooks/use-achievements'
import { UpsertAchivement } from './components'
import SectionLoading from '@/components/section-loading'

export default function Achievements(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { achievements, isLoading, error } = useAchievements(params.id);

    return (
        <main className='max-w-4xl py-4 m-auto'>
            <div>
                <div className='border-b py-4 mb-4'>
                    <h4 className='text-xl font-bold'>Achievements</h4>
                </div>
                <div className="mb-3">
                    <div className='flex flex-row gap-4 items-center py-3'>
                        <input placeholder='Search Achievments' className='w-full rounded-sm text-sm bg-white/5 py-2.5  px-4 border font-roboto ' />
                        <UpsertAchivement achievement={undefined} locationId={params.id} />
                    </div>
                </div>
                {isLoading || error ? (
                    <SectionLoading />
                ) : (
                    <>
                        {achievements.achievements.map((data: any) => {
                            return (
                                <Card key={data.id} className=' rounded-sm'>
                                    <CardContent className=' py-3 px-4  flex flex-row'>
                                        <Link href={`/dashboard/${params.id}/achievements/${data.id}`} className="w-full  inline-flex" >
                                            <div className="flex flex-row   w-full items-center justify-between">
                                                <div className="flex-initial flex gap-3 flex-row items-center">
                                                    <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-8 h-8 mr-2 bg-gray-200 rounded-full">
                                                        <AvatarImage
                                                            src={data.avatar}
                                                        />
                                                        <AvatarFallback className="group-hover:text-gray-100 group-hover:bg-violet-700 bg-gray-200 text-gray-400 text-lg font-bold">
                                                            {data.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-sm  group-hover:text-violet-600 font-bold text-black-200 font-poppins">
                                                        {data.name}
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="stroke-black-100 group-hover:stroke-violet-600" />
                                            </div>
                                        </Link>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </>
                )}
            </div>

        </main>
    )
}
