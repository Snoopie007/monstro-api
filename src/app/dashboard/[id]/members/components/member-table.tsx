"use client"

import {
    ColumnDef,
    Table as TansackTable,
    flexRender,

} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui"
import { Member } from "@/types"
import { Skeleton } from "@/components/ui"

interface DataTableProps<TData, TValue> {
    columns: number
    data: TData[]
    table: TansackTable<Member>
}

export function MemberTable<TData, TValue>({
    columns,
    table,
    isLoading,
}: { columns: number, table: TansackTable<Member>, isLoading: boolean }) {

    return (
        <div className="rounded-sm border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className="h-auto py-2">
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
                                            <TableCell key={cell.id} className="py-2" >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}

                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns} className="h-6 w-full font-medium text-center">
                                        No members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </>
                    )}

                </TableBody>
            </Table>
        </div>
    )
}