'use client';;
import { use } from "react";
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
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

import Loading from '@/components/loading';
import Link from 'next/link';
import { TablePage, TablePageContent, TablePageFooter, TablePageHeader, TablePageHeaderSection, TablePageHeaderTitle } from "@/components/ui/table-page";


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
            <TablePage>
                <TablePageHeader>
                    <TablePageHeaderTitle>Signed Contracts</TablePageHeaderTitle>
                    <TablePageHeaderSection>
                        <Link
                            href={`/dashboard/${params.id}/contracts/templates`}
                            className='bg-foreground text-background  h-auto inline-flex flex-row items-center  px-2 py-1 rounded-xs font-bold text-xs'
                        >
                            View Templates
                        </Link>
                    </TablePageHeaderSection>
                </TablePageHeader>
                <TablePageContent>
                    <Table className=" w-auto border-r border-b border-foreground/10 ">
                        <TableHeader className=" text-xs  border-foreground/10">
                            <TableRow className='bg-foreground/10 ' >
                                {["Title", "Program", "Plan", "Member", "Signed", "Download"].map((title) => (
                                    <TableHead key={title} className="font-semibold text-foreground h-auto py-2 border border-foreground/10 text-xs" >
                                        {title}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length > 0 ? (
                                <>
                                    {contracts.map((contract: any, index: number) => (
                                        <TableRow key={index} className='cursor-pointer '>
                                            <TableCell className="text-sm py-1 border border-foreground/10">
                                                {contract.contractTemplate.title}
                                            </TableCell>
                                            <TableCell className="text-sm  py-1 border border-foreground/10">
                                                {contract.plan ? contract.plan.program.name : ""}
                                            </TableCell>

                                            <TableCell className="text-sm  py-1 border border-foreground/10">
                                                {contract.plan ? contract.plan.name : ""}
                                            </TableCell>

                                            <TableCell className="text-sm  py-1 border border-foreground/10">
                                                {contract.member.firstName} {contract.member.lastName}
                                            </TableCell>

                                            <TableCell className="text-sm py-1 border border-foreground/10">
                                                {contract.created}
                                            </TableCell>

                                            <TableCell className="text-sm flex flex-row items-center justify-center  py-1 border border-foreground/10">
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
                </TablePageContent>
                <TablePageFooter className="border-t border-foreground/10">
                    <div className=" p-2">
                        <p className="text-xs ">Total Contracts: {contracts.length}</p>
                    </div>

                </TablePageFooter>
            </TablePage>

        )
    }
}
