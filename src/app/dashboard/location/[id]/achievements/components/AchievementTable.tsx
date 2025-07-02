'use client'

import React, { useState } from 'react'
import {
    TablePageHeader, TablePageHeaderSection, TablePageContent,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui';
import { Input } from '@/components/forms';
import { Skeleton } from '@/components/ui';
import { CreateAchievement, AchievementColumns } from '.';
import { useReactTable } from '@tanstack/react-table';
import { getCoreRowModel } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { Achievement, AchievementTrigger } from '@/types';
import { useAchievements } from '../providers';


interface AchievementTableProps {
    lid: string;
    triggers: AchievementTrigger[];
}

export function AchievementTable({ lid, triggers }: AchievementTableProps) {

    const { achievements } = useAchievements();

    const columns = AchievementColumns();

    const table = useReactTable({
        data: achievements,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });


    return (
        <>

            <TablePageHeader className="px-4  border-b border-foreground/5">
                <TablePageHeaderSection>
                    <Input
                        placeholder="Find a achievement..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => {
                            const value = event.target.value;
                            table.getColumn("name")?.setFilterValue(value);

                        }}
                        className="border  h-8.5 border-foreground/10 rounded-md w-auto"
                    />
                    <CreateAchievement lid={lid} triggers={triggers} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <Table className="w-auto border-r border-b border-foreground/5" >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="align-middle text-sm  bg-foreground/5">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-auto  border-foreground/5  py-1  text-foreground" >
                                            {header.isPlaceholder ? null : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="border border-foreground/5 py-1.5" >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}

                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-6 w-full font-medium text-center">
                                    No achievements found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TablePageContent>
        </>
    )
}