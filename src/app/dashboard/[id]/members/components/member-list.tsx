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
import { useState, useMemo } from "react";
import { MemberColumns } from "./member-columns";
import { Input } from "@/components/forms/input";
import { MemberTable } from "./member-table";
import ErrorComponent from "@/components/error";
import CreateMember from "./add-member";
import { Member } from "@/types/member";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { debounce } from "@tiptap-pro/extension-table-of-contents";
import ImportMember from "./import-member";
import { Separator } from "@/components/ui";
import { TablePageHeaderTitle } from "@/components/ui/table-page";
import { TablePageContent, TablePageHeaderSection } from "@/components/ui/table-page";
import { TablePageFooter, TablePage } from "@/components/ui/table-page";
import { TablePageHeader } from "@/components/ui/table-page";


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
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Signed Contracts</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <Input
                        placeholder="Find a member..."
                        // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => {
                            const value = event.target.value;
                            // table.getColumn("name")?.setFilterValue(value);
                            handleSearch(value);
                        }}
                        className="border text-sm h-auto py-1 border-foreground/10 rounded-xs"
                    />

                    <CreateMember locationId={params.id} stripeKey={stripeKey} />
                    <ImportMember locationId={params.id} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <MemberTable table={table} isLoading={isLoading} columns={columns.length} />
            </TablePageContent>
            <TablePageFooter>

                <div className="flex gap-2 items-center p-2">
                    <button
                        className="text-foreground/50 border-foreground/50 p-1 border rounded-xs hover:text-indigo-600 hover:border-indigo-600 cursor-pointer"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeftIcon size={14} />
                    </button>
                    <span>Page</span>
                    <span>
                        <input type="number" value={page + 1} onChange={(e) => setPage(Number(e.target.value) - 1)}
                            className="w-10 py-0.5 text-center border border-foreground/50 text-xs rounded-xs" />
                    </span>
                    <span>
                        of {totalPages}
                    </span>
                    <button

                        className="text-foreground/50 border-foreground/50 p-1 border rounded-xs hover:text-indigo-600 hover:border-indigo-600 cursor-pointer"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRightIcon size={14} />
                    </button>
                </div>
                <Separator orientation="vertical" className="bg-foreground/10" />
                <div className=" px-2">
                    Total members: {data?.count}
                </div>
            </TablePageFooter>
        </TablePage>

    );
}
