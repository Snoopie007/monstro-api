'use client';
import { use } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"
import Link from 'next/link'
import { useRewards } from '@/hooks/use-rewards'
import SectionLoader from '@/components/section-loading'
import { UpsertReward } from "./components";

import {
    TablePage, TablePageHeaderSection, TablePageHeaderTitle, TablePageHeader, TablePageContent,
    TableCell, Table, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui";
import { Reward } from "@/types";

export default function Rewards(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { rewards, isLoading, error } = useRewards(params.id)


    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Rewards</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <UpsertReward locationId={params.id} reward={undefined} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                {isLoading || error ? (
                    <SectionLoader />
                ) : (
                    <Table className=" w-auto border-r border-b border-foreground/10 ">
                        <TableHeader className=" text-xs  ">
                            <TableRow className='bg-foreground/10 ' >
                                {["Name", "Total Claimed"].map((title) => (
                                    <TableHead key={title} className="font-semibold text-foreground h-auto py-2 border border-foreground/10 text-xs" >
                                        {title}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rewards.length > 0 ? (
                                <>
                                    {rewards.map((reward: Reward, index: number) => (
                                        <TableRow key={index} className='cursor-pointer '>
                                            <TableCell className="text-sm py-2 border border-foreground/10">
                                                <Link href={`/dashboard/${params.id}/rewards/${reward.id}`} className="flex flex-row items-center">
                                                    <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-5 h-5 mr-2 bg-gray-200 rounded-full">
                                                        <AvatarImage
                                                            src={reward.images[0]}
                                                        />
                                                        <AvatarFallback className=" bg-gray-200 text-gray-400 text-xs ">
                                                            {reward.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">
                                                        {reward.name}
                                                    </span>
                                                </Link>

                                            </TableCell>

                                        </TableRow>
                                    ))}
                                </>
                            ) : (
                                <TableRow >
                                    <TableCell colSpan={7} className="text-sm py-4 px-6 font-roboto">
                                        <p className=' text-center'>No Rewards Found</p>
                                    </TableCell>
                                </TableRow>
                            )}

                        </TableBody>
                    </Table>
                )}

            </TablePageContent>
        </TablePage>

    )
}
