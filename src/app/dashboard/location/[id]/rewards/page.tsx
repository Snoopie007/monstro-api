'use client';
import { use, useMemo, useState } from "react";
import { Button, Skeleton } from "@/components/ui"
import { useRewards } from '@/hooks/useRewards'
import { RewardColumns, UpsertReward } from "./components";

import {
    TablePage, TablePageHeaderSection,
    TablePageHeaderTitle, TablePageHeader, TablePageContent,
    TableCell, Table, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui";
import { Reward } from "@/types";
import ErrorComponent from "@/components/error";
import { ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";

export default function Rewards(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { rewards, isLoading, error } = useRewards(params.id)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [currentReward, setCurrentReward] = useState<Partial<Reward> | undefined>(undefined);

    if (error) return <ErrorComponent error={error} />

    const columns = useMemo(() => RewardColumns(params.id, setCurrentReward), [params.id])
    const table = useReactTable<Reward>({
        data: !isLoading && rewards ? rewards : [], // Only use data when it's available
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getSortedRowModel: getSortedRowModel(),
        state: {
            columnFilters
        },
    });

    return (
        <>

            <UpsertReward locationId={params.id} reward={currentReward} setCurrentReward={setCurrentReward} />
            <TablePage>
                <TablePageHeader>
                    <TablePageHeaderTitle>Rewards</TablePageHeaderTitle>
                    <TablePageHeaderSection>
                        <Button variant={"foreground"} size={"xs"}
                            onClick={() => setCurrentReward({
                                name: "",
                                requiredPoints: 0,
                                limitPerMember: 0,
                                images: [],
                                description: "",
                                totalLimit: ""
                            })}
                        >
                            + Reward
                        </Button>
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
                            {isLoading ? (
                                <TableRow >
                                    {table.getHeaderGroups()[0].headers.map((header, i) => {
                                        return (
                                            <TableCell key={i}>
                                                <Skeleton className="w-full h-4 bg-gray-100" />
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ) : (
                                <>
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
                                                No rewards found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            )}

                        </TableBody>
                    </Table>

                </TablePageContent>
            </TablePage>
        </>

    )
}
