'use client';
import { useMembers } from "@/hooks/use-members"
import {
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useState } from "react";
import { MemberColumns } from "./member-columns";
import { Input } from "@/components/forms/input";
import { MemberTable } from "./member-table";
import ErrorComponent from "@/components/error";
import CreateMember from "./add-member";

export function MemberList({ params, stripeKey }: { params: { id: string }, stripeKey: string | null }) {
    const { data, error, isLoading } = useMembers(params.id)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const columns = MemberColumns(params.id)
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
        },
    })



    if (error) { return <ErrorComponent error={error} /> }
    return (
        <>

            <div className="flex flex-row items-center gap-4 mb-2">
                <div className="min-w-[350px]">
                    <Input
                        placeholder="Filter names..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                        className="border text-sm h-auto py-2 border-foreground rounded-sm"
                    />
                </div>
                <CreateMember locationId={params.id} stripeKey={stripeKey} />


            </div>

            <div className="flex flex-col w-full">
                <MemberTable table={table} isLoading={isLoading} columns={columns.length} />
            </div >
        </>

    )
}
