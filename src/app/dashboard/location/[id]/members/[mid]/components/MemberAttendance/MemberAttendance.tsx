"use client";
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

import { ExtendedAttendance } from "@/types";
import { Card } from "@/components/ui/card";
import { useAttedance } from "@/hooks";
import {
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { MemberAttendanceColumns } from "./MemberAttendanceColumns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import { useState, useMemo, useCallback } from "react";
import React from "react";

export function MemberAttedance({
  params,
}: {
  params: { id: string; mid: string };
}) {
  const { attendances, error, isLoading } = useAttedance(params.id, params.mid);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Memoize the programs array to prevent recalculation on every render
  const programs: string[] = useMemo(() => {
    if (!attendances) return [];
    return Array.from(
      new Set(
        attendances.map(
          (attendance: ExtendedAttendance) => attendance.programName
        )
      )
    );
  }, [attendances]);

  // Memoize the table data to prevent unnecessary re-renders
  const tableData = useMemo(() => attendances || [], [attendances]);

  // Memoize callback functions to prevent table re-creation
  const onSortingChange = useCallback(
    (updater: any) => setSorting(updater),
    []
  );
  const onColumnFiltersChange = useCallback(
    (updater: any) => setColumnFilters(updater),
    []
  );

  // Memoize the table state
  const tableState = useMemo(
    () => ({
      sorting,
      columnFilters,
    }),
    [sorting, columnFilters]
  );

  // Memoize the table configuration
  const table = useReactTable({
    data: tableData,
    columns: MemberAttendanceColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    onColumnFiltersChange,
    getFilteredRowModel: getFilteredRowModel(),
    state: tableState,
  });

  // Memoize the filter change handler
  const handleProgramFilter = useCallback(
    (value: string) => {
      table
        .getColumn("programName")
        ?.setFilterValue(value === "all" ? "" : value);
    },
    [table]
  );

  // Memoize the loading skeleton rows to prevent recreation
  const skeletonRows = useMemo(() => {
    if (!isLoading) return null;

    return (
      <TableRow>
        {table.getHeaderGroups()[0]?.headers.map((header, i) => (
          <TableCell key={i}>
            <Skeleton className="w-full h-4 bg-gray-100" />
          </TableCell>
        ))}
      </TableRow>
    );
  }, [isLoading, table]);

  // Memoize the table rows to prevent unnecessary re-renders
  const tableRows = useMemo(() => {
    if (isLoading) return skeletonRows;

    const rows = table.getRowModel().rows;

    if (!rows?.length) {
      return (
        <TableRow>
          <TableCell
            colSpan={MemberAttendanceColumns.length}
            className="h-6 w-full text-center"
          >
            No results.
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="py-2">
            {
              flexRender(
                cell.column.columnDef.cell,
                cell.getContext()
              ) as React.ReactNode
            }
          </TableCell>
        ))}
      </TableRow>
    ));
  }, [isLoading, skeletonRows, table]);

  return (
    <div className="space-y-0">
      <div className="flex flex-row justify-between items-center px-4 py-2  bg-foreground/5  gap-2">
        <div className="flex flex-row gap-2 items-center">
          <Select onValueChange={handleProgramFilter}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program, index) => (
                <SelectItem key={`${program}-${index}`} value={program}>
                  {program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Card className="border-y border-x-0 border-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-auto py-2">
                      {header.isPlaceholder
                        ? null
                        : (flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          ) as React.ReactNode)}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{tableRows}</TableBody>
        </Table>
      </Card>
    </div>
  );
}
