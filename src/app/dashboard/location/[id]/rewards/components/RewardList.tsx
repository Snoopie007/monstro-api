'use client'

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Empty, EmptyMedia,
    EmptyDescription,
    EmptyTitle,
    EmptyHeader
} from '@/components/ui';
import { RewardColumns } from '.';
import { useRewards } from '../providers';
import { flexRender, getCoreRowModel, useReactTable } from '@/libs/table-utils';
import { usePermission } from '@/hooks/usePermissions';
import { GiftIcon } from 'lucide-react';


export function RewardList({ lid }: { lid: string }) {
    const { rewards } = useRewards();
    // const canEditReward = usePermission("edit reward", lid);
    const columns = RewardColumns(lid);

    const table = useReactTable({
        data: rewards,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });


    return (
        <div>

            {rewards.length > 0 ? (
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
                            <GiftIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No rewards found</EmptyTitle>
                        <EmptyDescription>Rewards will appear here when they are created</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>


    )
}

