'use client'

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Empty, EmptyMedia,
    EmptyDescription,
    EmptyTitle,
    EmptyHeader
} from '@/components/ui';
import { Input } from '@/components/forms';
import { AchievementColumns } from '.';
import { useAchievements } from '../providers';
import { flexRender, getCoreRowModel, useReactTable } from '@/libs/table-utils';
import { usePermission } from '@/hooks/usePermissions';
import { TrophyIcon } from 'lucide-react';


export function AchievementList({ lid }: { lid: string }) {
    const { achievements } = useAchievements();
    const canEditAchievement = usePermission("edit achievement", lid);
    const columns = AchievementColumns({ canEditAchievement });

    const table = useReactTable({
        data: achievements,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });


    return (
        <div>

            {achievements.length > 0 ? (
                <Table >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} >
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="bg-foreground/5" >
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
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}  >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}

                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}

                    </TableBody>
                </Table>
            ) : (
                <Empty variant="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <TrophyIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No achievements found</EmptyTitle>
                        <EmptyDescription>Achievements will appear here when they are earned</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>


    )
}