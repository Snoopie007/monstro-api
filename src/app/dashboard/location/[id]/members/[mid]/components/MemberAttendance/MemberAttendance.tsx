'use client'
import {
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui"

import { ExtendedAttendance } from '@/types';
import { Card } from '@/components/ui/card';
import { useAttedance } from "@/hooks";
import { getCoreRowModel, getFilteredRowModel, flexRender, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { MemberAttendanceColumns } from "./MemberAttendanceColumns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { useState } from "react";


export function MemberAttedance({ params }: { params: { id: string, mid: number } }) {

    const { attendances, error, isLoading } = useAttedance(params.id, params.mid);

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        []
    )

    const programs: string[] = attendances
        ? Array.from(new Set(attendances.map((attendance: ExtendedAttendance) => attendance.programName)))
        : [];

    const table = useReactTable({
        data: attendances || [],
        columns: MemberAttendanceColumns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    })


    return (
        <div className="space-y-2">
            <div className="flex flex-row justify-between items-center px-4 gap-2">
                <div className="flex flex-row gap-2 items-center">
                    <Select onValueChange={(value) => {
                        table.getColumn("programName")?.setFilterValue(value)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by program" />
                        </SelectTrigger>
                        <SelectContent>
                            {programs.map((program: string, index: number) => (
                                <SelectItem key={`${program}-${index}`} value={program}>
                                    {program}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Card className="border-y border-x-0">
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
                                        <TableCell colSpan={MemberAttendanceColumns.length} className="h-6 w-full text-center">
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}


                    </TableBody>
                </Table>
            </Card>

        </div>
    )
}

