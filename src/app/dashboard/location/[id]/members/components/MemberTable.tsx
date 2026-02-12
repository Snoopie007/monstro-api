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
import { MemberListItem } from "@subtrees/types";
import { Skeleton } from "@/components/ui";

export function MemberTable<TData, TValue>({
	columns,
	table,
	isLoading,
}: {
	columns: number;
	table: TansackTable<MemberListItem>;
	isLoading: boolean;
}) {
	return (
		<Table className="w-full">
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
									className="h-10 border-l border-foreground/5 py-1 text-foreground whitespace-nowrap"
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
								<TableCell key={i} className="whitespace-nowrap">
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
											className="border border-foreground/5 py-1 whitespace-nowrap"
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
									className="h-6 w-full font-medium text-center whitespace-nowrap"
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
