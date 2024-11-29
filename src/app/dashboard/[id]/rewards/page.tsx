'use client';
import { use } from "react";
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRewards } from '@/hooks/use-rewards'
import SectionLoader from '@/components/section-loading'

export default function Rewards(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { rewards, isLoading, error } = useRewards(params.id)


    return (
        <main className='max-w-4xl py-4 m-auto'>
            <div className='border-b py-4 mb-4'>
                <h4 className='text-xl font-bold'>Rewards</h4>
            </div>
            <div className="mb-3">

                <div className='flex flex-row gap-4 items-center py-3'>
                    <input placeholder='Search Rewards' className='w-full rounded-sm text-sm bg-white/5 py-2.5  px-4 border font-roboto ' />
                    {/* <AddProgram /> */}
                </div>
            </div>
            <div className=" grid grid-cols-3 gap-5 ">

                {isLoading || error ? (
                    <SectionLoader />
                ) : (
                    <>
                        {rewards.map((data: any) => {
                            return (
                                <Card key={data.id} className=' rounded-sm'>
                                    <CardContent className=' py-3 px-4  flex flex-row'>
                                        <Link href={`/dashboard/${params.id}/programs/${data.id}`} className="w-full  inline-flex" >
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
