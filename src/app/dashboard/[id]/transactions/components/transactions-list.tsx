
'use client'
import { useMemo, useState } from "react";

import { Button, Skeleton } from "@/components/ui"

import { useRewards } from '@/hooks/use-rewards'

import {
    TablePage, TablePageHeaderSection, TablePageHeaderTitle, TablePageHeader, TablePageContent,
    TableCell, Table, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui";
import { Reward } from "@/types";

import ErrorComponent from "@/components/error";
import { ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { TransactionColumns } from "./transactions-columns";
import { Transaction } from "@/types";
import { Input } from "@/components/forms";

export function TransactionsList({ params, transactions }: { params: { id: string }, transactions: Transaction[] }) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [currentReward, setCurrentReward] = useState<Reward | undefined>(undefined);



    const columns = useMemo(() => TransactionColumns(params.id), [params.id])
    const table = useReactTable<Transaction>({
        data: transactions,
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
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Transactions</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <Input
                        placeholder="Find a transaction..."
                        // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            const value = event.target.value;
                            // table.getColumn("name")?.setFilterValue(value);

                        }}
                        className="border text-xs h-auto py-1 border-foreground/10 rounded-xs"
                    />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <Table className="w-auto border-r border-b border-foreground/5" >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="align-middle text-sm  bg-foreground/5">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-auto  border border-foreground/5  py-1  text-foreground" >
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
                        {false ? (
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
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                    </TableBody>
                </Table>

            </TablePageContent>
        </TablePage>

    )
}

