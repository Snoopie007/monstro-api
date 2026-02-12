'use client';;
import { use, useState } from "react";
import { Button } from '@/components/ui';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui";
import { useSignedContracts } from '@/hooks/useContracts';

import Link from 'next/link';
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { CloudDownloadIcon, FileIcon, LoaderIcon } from "lucide-react";
import { MemberContract } from "@subtrees/types";
import { Input } from "@/components/forms";


export default function MemberContractsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading } = useSignedContracts(params.id);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    async function downloadContract(signedId: string, mid: string) {
        setDownloadingId(signedId);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/contracts/signed/${signedId}/${mid}`)
        );

        if (error || !result || !result.ok) {
            setDownloadingId(null);
            return toast.error(error?.message || "Error downloading contract");
        }

        const blob = await result.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contract_${signedId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadingId(null);
    }
    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-3xl mx-auto w-full space-y-4">
                <div className="flex flex-row items-center justify-between">
                    <Input
                        placeholder="Find a contract..."
                        variant="search"
                        className="h-10 bg-foreground/5 rounded-lg w-[300px]"
                    />
                    <Button variant={"primary"} asChild>
                        <Link href={`/dashboard/location/${params.id}/contracts/templates`}>
                            View Templates
                        </Link>
                    </Button>
                </div>
                <div className="border border-foreground/10 rounded-lg">

                    {!isLoading && contracts && contracts.length > 0 ? (
                        <Table>
                            <TableHeader >
                                <TableRow className='bg-foreground/10 ' >
                                    {["Title", "Member", "Signed Date"].map((title) => (
                                        <TableHead key={title} >
                                            {title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract: MemberContract, index: number) => (
                                    <TableRow key={index} className='cursor-pointer  '>
                                        <TableCell>
                                            {contract.contractTemplate?.title}
                                            <Button variant={"ghost"} size={"icon"}
                                                onClick={() => downloadContract(contract.id, contract.memberId)}
                                                disabled={downloadingId === contract.id}
                                                className="size-6 hover:bg-foreground/5 text-foreground/50 rounded-sm">
                                                {downloadingId === contract.id ? (
                                                    <LoaderIcon className="size-3.5 animate-spin" />
                                                ) : (
                                                    <CloudDownloadIcon className="size-3.5" />
                                                )}
                                            </Button>
                                        </TableCell>


                                        <TableCell >
                                            {contract.member?.firstName} {contract.member?.lastName}
                                        </TableCell>

                                        <TableCell >
                                            {format(contract.created, "MM/dd/yyyy")}
                                        </TableCell>
                                    </TableRow>
                                ))}

                            </TableBody>
                        </Table>
                    ) : (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FileIcon className="size-5" />
                                </EmptyMedia>
                                <EmptyTitle>No contracts found</EmptyTitle>
                                <EmptyDescription>Create a contract to get started</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}

                </div>
            </div>

        </div >

    )
}
