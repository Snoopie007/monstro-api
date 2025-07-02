"use client";

import { Table as TansackTable } from "@tanstack/react-table";
import { flexRender } from "@/libs/table-utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Member } from "@/types";
import { Skeleton } from "@/components/ui";

export function MemberTable<TData, TValue>({
  columns,
  table,
  isLoading,
}: {
  columns: number;
  table: TansackTable<Member>;
  isLoading: boolean;
}) {
  return (
    <Table className="w-auto  border-r border-b border-foreground/5">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className="align-middle text-sm  bg-foreground/5"
          >
            {headerGroup.headers.map((header) => {
              return (
                <TableHead
                  key={header.id}
                  className="h-auto border-l border-foreground/5 py-1  text-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            {table.getHeaderGroups()[0].headers.map((header, i) => {
              return (
                <TableCell key={i}>
                  <Skeleton className="w-full h-4 g-gray-100" />
                </TableCell>
              );
            })}
          </TableRow>
        ) : (
          <>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border border-foreground/5 py-1"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns}
                  className="h-6 w-full font-medium text-center"
                >
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </TableBody>
    </Table>
  );
}
