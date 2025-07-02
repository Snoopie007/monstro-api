"use client";
import React, { use} from "react";

import { useAchievements } from "@/hooks";
import {
  TablePage,
  TablePageHeaderSection,
  TablePageHeader,
  TablePageContent,
  TableCell,
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TablePageFooter,
  Skeleton,
} from "@/components/ui";
import { Input } from "@/components/forms";
import ErrorComponent from "@/components/error";
import { useReactTable, getCoreRowModel, flexRender } from "@/libs/table-utils";
import { AchievementColumns } from "./components/AchievementColumns";
import { CreateAchievement } from "./components";

export default function Achievements(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const { achievements, isLoading, error } = useAchievements(params.id);

  const columns = AchievementColumns();
  const table = useReactTable({
    data: achievements,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (error) return <ErrorComponent error={error} />;

  return (
    <TablePage>
      <TablePageHeader className="px-4  border-b border-foreground/5">
        <TablePageHeaderSection>
          <Input
            placeholder="Find a achievement..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              table.getColumn("name")?.setFilterValue(value);
            }}
            className="border  h-8.5 border-foreground/10 rounded-md w-auto"
          />
          <CreateAchievement lid={params.id} />
        </TablePageHeaderSection>
      </TablePageHeader>
      <TablePageContent>
        <Table className="w-auto border-r border-b border-foreground/5">
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
                      className="h-auto  border-foreground/5  py-1  text-foreground"
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
                      No achievements found.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TablePageContent>
      <TablePageFooter>
        <div className="p-2">
          Showing {achievements && achievements.length} achievements
        </div>
      </TablePageFooter>
    </TablePage>
  );
}
