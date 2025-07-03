"use client";
import { usePackages } from "@/hooks";
import ErrorComponent from "@/components/error";
import {
  TablePageContent,
  TablePageFooter,
  TableCell,
  TableHeader,
  Table,
  TableRow,
  TableHead,
  TableBody,
  Skeleton,
} from "@/components/ui";
import Loading from "@/components/loading";
import { flexRender, useReactTable, getCoreRowModel } from "@/libs/table-utils";

import { SubColumns } from "./SubscriptionColumns";

export function PackageList({ lid }: { lid: string }) {
  const { packages, isLoading, error } = usePackages(lid);

  const columns = SubColumns(lid);

  const table = useReactTable({
    data: packages || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (error) return <ErrorComponent error={error} />;
  if (isLoading) return <Loading />;

  return (
    <>
      <TablePageContent>
        <Table className="w-auto border-r border-b border-foreground/5">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="align-middle text-sm bg-foreground/5"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="h-auto border-r last:border-r-0 border-foreground/5 py-1 text-foreground"
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
                      <Skeleton className="w-full h-4 bg-gray-100" />
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
                          className="border border-foreground/5 py-1.5"
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
                      colSpan={columns.length}
                      className="h-6 w-full font-medium text-center"
                    >
                      No subscriptions found.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TablePageContent>
      <TablePageFooter>
        <p className="p-2">{packages?.length} packages found</p>
      </TablePageFooter>
    </>
  );
}
