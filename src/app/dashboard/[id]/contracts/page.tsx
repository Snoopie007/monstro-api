'use client';;
import { use } from "react";
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui";
import { useSignedContracts } from '@/hooks/use-contracts';
import { fetcher } from '@/libs/api';
import { formatDateTime } from '@/libs/utils';

import Loading from '@/components/loading';
import Link from 'next/link';
import { ChevronRight } from "lucide-react";


export default function MemberContractsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading } = useSignedContracts(params.id);

    async function downloadContract(signedId: number) {
        const data = await fetcher({ id: params.id, url: `contracts/signed/${signedId}` });

        if (data && data.pdfUrl) {
            // Trigger the download
            const link = document.createElement('a');
            link.href = data.pdfUrl; // URL from the backend
            link.download = 'contract.pdf'; // Suggested filename for the downloaded PDF
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    if (isLoading) {
        return <Loading />
    }
    if (contracts) {
        return (
            <div className='flex flex-col gap-0 h-full'>
                <div className='flex flex-row flex-initial justify-start items-center gap-2 '>
                    <div className="border-r border-foreground/10 p-2.5">
                        <h6 className='text-sm font-bold'>Signed Contracts</h6>

                    </div>
                    <div>
                        <Link
                            href={`/dashboard/${params.id}/contracts/templates`}
                            className='bg-foreground text-background  h-auto inline-flex flex-row items-center  px-2 py-1 rounded-xs font-bold text-xs'
                        >
                            View Templates
                        </Link>

                    </div>
                </div>
                <div className='flex-1 border-y border-foreground/10'>
                    <Table className=" w-full ">
                        <TableHeader className=" text-xs">
                            <TableRow className='' >
                                {["Title", "Program", "Plan", "Member", "Signed", "Download"].map((title) => (
                                    <TableHead key={title} className="font-semibold h-auto py-3 text-xs" >
                                        {title}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length > 0 ? (
                                <>
                                    {contracts.map((contract: any, index: number) => (
                                        <TableRow key={index} className='cursor-pointer'>
                                            <TableCell className="text-sm py-2  ">
                                                {contract.contractTemplate.title}
                                            </TableCell>
                                            <TableCell className="text-sm  py-2  ">
                                                {contract.plan.program.name}
                                            </TableCell>

                                            <TableCell className="text-sm  py-2 ">
                                                {contract.plan.name}
                                            </TableCell>

                                            <TableCell className="text-sm  py-2  ">
                                                {contract.member.firstName} {contract.member.lastName}
                                            </TableCell>

                                            <TableCell className="text-sm py-2 ">
                                                {formatDateTime(contract.created)}
                                            </TableCell>

                                            <TableCell className="text-sm  py-2  ">
                                                <Button variant={"ghost"} onClick={() => downloadContract(contract.id)} className="h-auto p-1">
                                                    <Icon name="Download" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : (
                                <TableRow >
                                    <TableCell colSpan={7} className="text-sm py-4 px-6 font-roboto">
                                        <p className=' text-center'>No Contracts Found</p>
                                    </TableCell>
                                </TableRow>

                            )}

                        </TableBody>
                    </Table>
                </div>
                <div className='flex-initial p-2'>
                    <div className='flex flex-row justify-between items-center  text-sm'>
                        <p>Total Contracts: {contracts.length}</p>
                    </div>
                </div>
            </div>
        )
    }
}
