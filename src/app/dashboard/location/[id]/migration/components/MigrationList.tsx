'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Empty,
    EmptyMedia,
    EmptyDescription,
    EmptyTitle,
    EmptyHeader,
} from '@/components/ui'
import { MigrationColumns } from '.'
import { flexRender, getCoreRowModel, useReactTable } from '@/libs/table-utils'
import { useMigrations } from '../../../../../../hooks/useMigrations'
import { DownloadCloud } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'

export function MigrationList({ lid }: { lid: string }) {
    const [page, setPage] = useState(0)
    const [pageSize] = useState(15)

    const { migrations, count, isLoading, refetch } = useMigrations({
        locationId: lid,
        page,
        size: pageSize,
    })

    const columns = useMemo(() => MigrationColumns(), [])

    const totalPages = useMemo(() => {
        if (count && pageSize > 0) {
            return Math.ceil(count / pageSize)
        }
        return 1
    }, [count, pageSize])

    const table = useReactTable({
        data: migrations,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        state: {
            pagination: {
                pageIndex: page,
                pageSize,
            },
        },
    })

    useEffect(() => {
        refetch()
    }, [page, pageSize, refetch])

    return (
        <div>
            {migrations.length > 0 ? (
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="bg-foreground/5">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
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
                            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
                            <DownloadCloud className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No migrations found</EmptyTitle>
                        <EmptyDescription>
                            Start by importing members to see them here
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}

