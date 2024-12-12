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
            <div className='max-w-6xl py-4 m-auto'>
                <div className='flex flex-row justify-between items-center py-4 mb-4'>
                    <div>
                        <h4 className='text-xl font-bold'>Signed Contracts</h4>
                        <p className='text-sm text-foreground/80'>Manage and oversee all documents & contracts created for your business.</p>
                    </div>
                    <div>
                        <Link
                            href={`/dashboard/${params.id}/contracts/templates`}
                            className='bg-foreground text-background  h-auto inline-flex flex-row items-center gap-2 px-4 py-2.5 rounded-sm font-bold text-sm'
                        >
                            <span>        View Templates</span>
                            <ChevronRight size={16} className='' />
                        </Link>

                    </div>
                </div>
                <Card className='rounded-sm shadow-none'>
                    <CardContent className='p-0'>
                        <Table className=" w-full ">
                            <TableHeader className=" text-xs">
                                <TableRow className='' >
                                    {["Title", "Program", "Plan", "Member", "Signed", "Download"].map((title) => (
                                        <TableHead key={title} className="font-semibold h-auto py-4 text-xs" >
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
                    </CardContent>
                </Card>
            </div>
        )
    }
}
