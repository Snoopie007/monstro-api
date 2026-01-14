'use client'

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Empty, EmptyMedia,
    EmptyDescription,
    EmptyTitle,
    EmptyHeader
} from '@/components/ui';
import { TransactionColumns } from './TransactionsColumns';
import { useTransactions } from '../providers';
import { flexRender, getCoreRowModel, useReactTable } from '@/libs/table-utils';
import { ReceiptIcon } from 'lucide-react';

export function TransactionsList({ lid }: { lid: string }) {
    const { transactions } = useTransactions();
    const columns = TransactionColumns();

    const table = useReactTable({
        data: transactions,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div>
            {transactions.length > 0 ? (
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="bg-foreground/5">
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
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
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
                            <ReceiptIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No transactions found</EmptyTitle>
                        <EmptyDescription>Transactions will appear here when they occur</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}
