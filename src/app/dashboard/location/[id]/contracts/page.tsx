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
import { useSignedContracts } from '@/hooks/useContracts';

import Loading from '@/components/loading';
import Link from 'next/link';
import {
    TablePage, TablePageContent, TablePageFooter,
    TablePageHeader, TablePageHeaderSection, TablePageHeaderTitle
} from "@/components/ui/TablePage";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { CloudDownloadIcon } from "lucide-react";
import { Contract, MemberContract } from "@/types";


export default function MemberContractsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading } = useSignedContracts(params.id);

    async function downloadContract(signedId: string, mid: string) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/contracts/signed/${signedId}/${mid}`)
        );

        if (error || !result || !result.ok) {
            return toast.error(error?.message || "Error downloading contract");
        }

        const data = await result.json();
        console.log(data);
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = 'contract.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                            href={`/dashboard/location/${params.id}/contracts/templates`}
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
                                {["Title", "Member", "Signed Date"].map((title) => (
                                    <TableHead key={title} className="font-semibold text-foreground h-auto py-2 border border-l-0 border-foreground/10 text-xs" >
                                        {title}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length > 0 ? (
                                <>
                                    {contracts.map((contract: MemberContract, index: number) => (
                                        <TableRow key={index} className='cursor-pointer  '>
                                            <TableCell className="text-sm py-1 w-[200px]  flex flex-row items-center justify-between">
                                                {contract.contractTemplate?.title}
                                                <Button variant={"ghost"} size={"icon"}
                                                    onClick={() => downloadContract(contract.id, contract.memberId)}
                                                    //asChild
                                                    className="size-6 hover:bg-foreground/5 text-foreground/50 rounded-sm">
                                                    {/* <Link href={""} target="_blank"> */}
                                                    <CloudDownloadIcon className="size-3.5" />
                                                    {/* </Link> */}
                                                </Button>
                                            </TableCell>


                                            <TableCell className="text-sm  py-1 border border-foreground/10">
                                                {contract.member?.firstName} {contract.member?.lastName}
                                            </TableCell>

                                            <TableCell className="text-sm py-1 border border-foreground/10">
                                                {format(contract.created, "MM/dd/yyyy")}
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
