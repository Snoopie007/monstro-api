'use client'
import React, { use } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import Link from 'next/link'
import { useAchievements } from '@/hooks/use-achievements'
import { UpsertAchivement } from './components'
import {
    TablePage, TablePageHeaderSection, TablePageHeaderTitle, TablePageHeader, TablePageContent,
    TableCell, Table, TableHead, TableHeader, TableRow, TableBody,
    TablePageFooter,
    Button
} from "@/components/ui";
import Loading from '@/components/loading';
import { Input } from '@/components/forms';
import { Achievement } from '@/types';
import ErrorComponent from '@/components/error';

export default function Achievements(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { achievements, isLoading, error } = useAchievements(params.id);

    if (isLoading) return <Loading />
    if (error) return <ErrorComponent error={error} />

    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Achievements</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <Input
                        placeholder="Find a member..."
                        // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            const value = event.target.value;
                            // table.getColumn("name")?.setFilterValue(value);

                        }}
                        className="border text-xs h-auto py-1 border-foreground/10 rounded-xs"
                    />
                    <UpsertAchivement achievement={undefined} locationId={params.id} >
                        <Button variant={"foreground"} size={"xs"} >
                            + Achievement
                        </Button>
                    </UpsertAchivement>
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <Table className=" w-auto border-r border-b border-foreground/10 ">
                    <TableHeader className=" text-xs  ">
                        <TableRow className='bg-foreground/10 ' >
                            {["Name", "Total Achieved"].map((title) => (
                                <TableHead key={title} className="font-semibold text-foreground h-auto py-2 border border-foreground/10 text-xs" >
                                    {title}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievements.length > 0 ? (
                            <>
                                {achievements.map((achievement: Achievement, index: number) => (
                                    <TableRow key={index} className='cursor-pointer '>
                                        <TableCell className="text-sm py-2 border border-foreground/10">
                                            <Link href={`/dashboard/${params.id}/achievements/${achievement.id}`} className="flex flex-row items-center">
                                                <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-5 h-5 mr-2 bg-gray-200 rounded-full">
                                                    <AvatarImage
                                                        src={achievement.badge}
                                                    />
                                                    <AvatarFallback className=" bg-gray-200 text-gray-400 text-xs ">
                                                        {achievement.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">
                                                    {achievement.name}
                                                </span>
                                            </Link>

                                        </TableCell>

                                    </TableRow>
                                ))}
                            </>
                        ) : (
                            <TableRow >
                                <TableCell colSpan={7} className="text-sm py-4 px-6 font-roboto">
                                    <p className=' text-center'>No Achievements Found</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                </Table>
            </TablePageContent>
            <TablePageFooter>
                <div className='p-2'>
                    Showing {achievements.length} achievements
                </div>
            </TablePageFooter>
        </TablePage>

    )
}
