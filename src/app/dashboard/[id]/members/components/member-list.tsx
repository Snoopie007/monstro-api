'use client';

import { useMembers } from "@/hooks/use-members";
import {
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import { MemberColumns } from "./member-columns";
import { Input } from "@/components/forms/input";
import { MemberTable } from "./member-table";
import ErrorComponent from "@/components/error";
import CreateMember from "./add-member";
import { Member } from "@/types/member"; // Adjust this import based on your actual types

export function MemberList({ params, stripeKey }: { params: { id: string }, stripeKey: string | null }) {
    const { data, error, isLoading } = useMembers(params.id);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    
    const columns = useMemo(() => MemberColumns(params.id), [params.id]);

    const table = useReactTable<Member>({
        data: data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnFilters,
        },
        onColumnFiltersChange: setColumnFilters,
        filterFns: {
            fuzzy: (row, columnId, filterValue) => {
                const value = row.getValue(columnId) as string;
                return value.toLowerCase().includes(filterValue.toLowerCase());
            },
        },
        manualFiltering: false,
    });

    useEffect(() => {
        console.log("Current data:", data);
        console.log("Current column filters:", columnFilters);
        console.log("Filtered rows:", table.getFilteredRowModel().rows);
    }, [data, columnFilters, table]);

    if (error) {
        return <ErrorComponent error={error} />;
    }

    return (
        <>
            <div className="flex flex-row items-center gap-4 mb-2">
                <div className="min-w-[350px]">
                    <Input
                        placeholder="Filter names..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => {
                            const value = event.target.value;
                            table.getColumn("name")?.setFilterValue(value);
                        }}
                        className="border text-sm h-auto py-2 border-foreground rounded-sm"
                    />
                </div>
                <CreateMember locationId={params.id} stripeKey={stripeKey} />
            </div>

            <div className="flex flex-col w-full">
                <MemberTable table={table} isLoading={isLoading} columns={columns.length} />
            </div>
        </>
    );
}

