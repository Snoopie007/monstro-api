"use client";

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
  Skeleton,
} from "@/components/ui";
import { MigrationColumns } from ".";
import { flexRender, getCoreRowModel, useReactTable } from "@/libs/table-utils";
import { useMigrations } from "../../../../../../hooks/useMigrations";
import { DownloadCloud } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function MigrationList({ lid }: { lid: string }) {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);

  const { migrations, count, isLoading, refetch } = useMigrations({
    locationId: lid,
    page,
    size: pageSize,
  });

  const columns = useMemo(() => MigrationColumns(), []);

  const totalPages = useMemo(() => {
    if (count && pageSize > 0) {
      return Math.ceil(count / pageSize);
    }
    return 1;
  }, [count, pageSize]);

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
  });

  useEffect(() => {
    refetch();
  }, [page, pageSize, refetch]);

  return (
    <div className="space-y-2">
      <div className="border border-foreground/10 rounded-lg overflow-hidden">
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
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {table
                      .getHeaderGroups()[0]
                      .headers.map((header, cellIndex) => (
                        <TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
                          <Skeleton className="w-full h-4" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </>
            ) : migrations.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-row items-center justify-between px-4 py-2 text-sm">
        <div className="text-muted-foreground">
          Total migrations:{" "}
          <span className="font-medium text-foreground">{count}</span>
        </div>

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(page - 1)}
                  className={
                    page === 0
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(i)}
                      isActive={page === i}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(page + 1)}
                  className={
                    page >= totalPages - 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
