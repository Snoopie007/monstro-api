import { Program } from '@/types';

import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'

export function ProgramList({ programs, locationId }: { programs: Program[], locationId: string }) {

    return (
        <Table className=" w-auto border-r border-b border-foreground/10 ">
            <TableHeader className=" text-xs  ">
                <TableRow className='bg-foreground/10 ' >
                    {["Name", "Plans"].map((title) => (
                        <TableHead key={title} className="font-semibold text-foreground h-auto py-2 border border-foreground/10 text-xs" >
                            {title}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {programs.length > 0 ? (
                    <>
                        {programs.map((program: Program, index: number) => (
                            <TableRow key={index} className='cursor-pointer '>
                                <TableCell className="text-sm py-2 border border-foreground/10">
                                    <Link href={`/dashboard/${locationId}/programs/${program.id}`} className="" >
                                        {program.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-sm py-2 border border-foreground/10">
                                    {program.planCounts}
                                </TableCell>

                            </TableRow>
                        ))}
                    </>
                ) : (
                    <TableRow >
                        <TableCell colSpan={7} className="text-sm py-4 px-6 font-roboto">
                            <p className=' text-center'>No Programs Found</p>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>

    )
}
