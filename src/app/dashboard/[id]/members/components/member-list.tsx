'use client';

import { useMembers } from "@/hooks/use-members";
import {
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import { MemberColumns } from "./member-columns";
import { Input } from "@/components/forms/input";
import { MemberTable } from "./member-table";
import ErrorComponent from "@/components/error";
import CreateMember from "./add-member";
import { Member } from "@/types/member";
import { debounce } from "@tiptap-pro/extension-table-of-contents";

export function MemberList({ params, stripeKey }: { params: { id: string }, stripeKey: string | null }) {
    // Pagination state
    const [page, setPage] = useState(0); // Current page index (0-based)
    const [pageSize, setPageSize] = useState(10); // Number of rows per page
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [searchQuery, setSearchQuery] = useState(""); // Search input state

    // Fetch data with pagination
    const { data, error, isLoading } = useMembers(params.id, searchQuery, page + 1, pageSize); // Send `page + 1` because the backend may use 1-based indexing.

    const columns = useMemo(() => MemberColumns(params.id), [params.id]);

    const totalPages = useMemo(() => {
        if (data?.count && pageSize > 0) {
            return Math.ceil(data.count / pageSize); // size: total items, pageSize: items per page
        }
        return 1; // Default to 1 page if data is unavailable
    }, [data?.count, pageSize]);
    
    const table = useReactTable<Member>({
        data: !isLoading && data?.members ? data.members : [], // Only use data when it's available
        columns,
        pageCount: totalPages, // Set total pages from the API
        filterFns: {},
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getSortedRowModel: getSortedRowModel(),
        state: {
            pagination: {
                pageIndex: page,
                pageSize,
            },
            columnFilters
        },
        onPaginationChange: (updater) => {
            const newState =
                typeof updater === "function"
                    ? updater({ pageIndex: page, pageSize })
                    : updater;
            setPage(newState.pageIndex);
            setPageSize(newState.pageSize);
        },
        manualPagination: true, // Enable manual pagination
    });

    useEffect(() => {
        console.log("Current page:", page);
        console.log("Page size:", pageSize);
        console.log("Current rows:", table.getPaginationRowModel().rows);
    }, [page, pageSize, table]);

    useEffect(() => {
        console.log("Current data:", data);
        console.log("Current column filters:", columnFilters);
        console.log("Filtered rows:", table.getFilteredRowModel().rows);
        
    }, [data, columnFilters, table]);

    const handleSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchQuery(value); // Update search query state
                setPage(0); // Reset to first page on new search
            }, 500), // Wait 300ms after typing stops
        []
    );

    if (error) {
        return <ErrorComponent error={error} />;
    }

    return (
        <>
            <div className="flex flex-row items-center gap-4 mb-2">
                <div className="min-w-[350px]">
                    <Input
                        placeholder="Filter names..."
                        // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => {
                            const value = event.target.value;
                            // table.getColumn("name")?.setFilterValue(value);
                            handleSearch(value);
                        }}
                        className="border text-sm h-auto py-2 border-foreground rounded-sm"
                    />
                </div>
                <CreateMember locationId={params.id} stripeKey={stripeKey} />
            </div>

            <div className="flex flex-col w-full">
                <MemberTable table={table} isLoading={isLoading} columns={columns.length} />
                <div className="flex justify-between items-center mt-4">
                    {/* Pagination Controls */}
                    <button
                        className="px-4 py-2 border rounded"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </button>
                    <span>
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        className="px-4 py-2 border rounded"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
}
