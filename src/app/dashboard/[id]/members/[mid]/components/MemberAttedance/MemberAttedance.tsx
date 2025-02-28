'use client'
import {
    ColumnDef,
    Table as TansackTable,
    flexRender,
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
} from "@tanstack/react-table"

import {
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui"

import { Attendance } from '@/types';
import { Card } from '@/components/ui/card';
import { useAttedance } from "@/hooks/hooks";


function FormatCheckInDateTime(date: Date) {
    return new Date(date).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        month: "short",
        day: "numeric",
        year: "numeric"
    })
}
const columns: ColumnDef<Attendance>[] = [
    {
        accessorKey: "program",
        header: "Program",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{attendance.program ? attendance.program.name : "No Program"}</span>
            )
        },

    },
    {
        accessorKey: "checkInTime",
        header: "Checked In",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{attendance.checkInTime ? FormatCheckInDateTime(attendance.checkInTime) : "Not Checked In"}</span>
            )
        },

    },
    {
        accessorKey: "timeToCheckIn",
        header: "Start Time",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{attendance.timeToCheckIn ? FormatCheckInDateTime(attendance.timeToCheckIn) : "No Start Time"}</span>
            )
        },
    },
    {
        accessorKey: "checkOutTime",
        header: "Check Out",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{attendance.checkOutTime ? FormatCheckInDateTime(attendance.checkOutTime) : "Not Checked Out"}</span>
            )
        }
    },
];


export function MemberAttedance({ params }: { params: { id: string, mid: number } }) {

    const { attendances, error, isLoading } = useAttedance(params.id, params.mid);

    const table = useReactTable({
        data: attendances,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    return (
        <div className="py-4">
            <Card className='rounded-sm'>
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
                                        <TableCell colSpan={columns.length} className="h-6 w-full text-center">
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
