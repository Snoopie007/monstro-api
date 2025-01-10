'use client';
import { use, useState } from "react";

import { usePrograms } from '@/hooks/use-programs';
import { AddProgram, ProgramList } from './components';
import ErrorComponent from '@/components/error';
import SectionLoader from '@/components/section-loading';
import { Program } from "@/types";
import { TablePage, TablePageHeaderTitle, TablePageHeader, TablePageHeaderSection, TablePageContent, TablePageFooter, TableCell, TableHeader, Table, TableRow, TableHead, TableBody, Skeleton } from "@/components/ui";
import Loading from "@/components/loading";
import { flexRender } from "@tanstack/react-table";
import { getCoreRowModel } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { ProgramColumns } from "./components/program-columns";


export default function Programs(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { data, isLoading, error } = usePrograms(params.id);
    const [searchQuery, setSearchQuery] = useState<string>("");

    const columns = ProgramColumns(params.id);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (error) return <ErrorComponent error={error} />
    if (isLoading) return <Loading />
    // Filter programs based on the search query
    const filteredPrograms = data?.filter((program: Program) =>
        program.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Programs</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <input
                        placeholder='Search programs'
                        className='text-xs bg-transparent py-1 px-2 rounded-xs border'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <AddProgram locationId={params.id} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <Table className="w-auto border-r border-b border-foreground/5" >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="align-middle text-sm  bg-foreground/5">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-auto  border-foreground/5  py-1  text-foreground" >
                                            {header.isPlaceholder ? null : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow >
                                {table.getHeaderGroups()[0].headers.map((header, i) => {
                                    return (
                                        <TableCell key={i}>
                                            <Skeleton className="w-full h-4 bg-gray-100" />
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ) : (
                            <>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="border border-foreground/5 py-1.5" >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}

                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-6 w-full font-medium text-center">
                                            No rewards found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                    </TableBody>
                </Table>
            </TablePageContent>
            <TablePageFooter>
                <p className="p-2">
                    {filteredPrograms?.length} programs found
                </p>
            </TablePageFooter>
        </TablePage>

    );
}
