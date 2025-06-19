'use client';;
import { use, useState } from "react";
import { CreateContract } from './components';
import { useContracts } from '@/hooks/useContracts';
import SectionLoading from '@/components/SectionLoading';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TablePage, TablePageContent, TablePageFooter,
    TablePageHeader, TablePageHeaderTitle, TablePageHeaderSection,
    Badge, Button
} from "@/components/ui/";
import { format } from "date-fns";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { Contract } from "@/types";

export default function ContractTemplatesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading, error } = useContracts(params.id);


    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>
                    Contract Templates
                </TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <CreateContract locationId={params.id} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <Table className=" w-auto border-r border-b border-foreground/5 ">
                    <TableHeader>
                        <TableRow className="border-b border-foreground/5" >
                            {["Title", "Created", "Type", "Status", "Editable", 'Require Signature', ""].map((title) => (
                                <TableHead key={title} className="font-semibold h-auto py-2 bg-foreground/5  text-xs" >
                                    {title}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading && contracts.length ? (
                            <>
                                {contracts.map((contract: Contract, index: number) => (
                                    <TableRow key={index} className='cursor-pointer'>
                                        <TableCell className="text-sm h-auto py-1 flex flex-row items-center justify-between w-[200px]">
                                            <span className="truncate">  {contract.title ? contract.title : "No Title"}</span>
                                            {contract.editable && (
                                                <Button variant={"ghost"} asChild size={"icon"}
                                                    className="size-6 hover:bg-foreground/5 text-foreground/50 rounded-sm">
                                                    <Link href={`/builder/${params.id}/contract/${contract.id}`}>
                                                        <PencilIcon className="size-3.5" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm h-auto py-1">
                                            {format(contract.created, "MM/dd/yyyy")}
                                        </TableCell>
                                        <TableCell className="text-sm capitalize h-auto py-1">
                                            {contract.type}
                                        </TableCell>
                                        <TableCell className="text-sm h-auto py-1">
                                            <Badge size={"tiny"} variant={contract.isDraft ? "destructive" : "active"} className="rounded-sm">
                                                {contract.isDraft ? "Draft" : "Active"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-sm h-auto py-1">
                                            <Badge size={"tiny"} variant={'default'} className="rounded-sm">
                                                {contract.editable ? "Editable" : "Not Editable"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm h-auto py-1">
                                            <Badge size={"tiny"} variant={contract.requireSignature ? "default" : "destructive"} className="rounded-sm">
                                                {contract.requireSignature ? "Yes" : "No"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm h-auto py-1">
                                            <RemoveContract id={contract.id} editable={contract.editable} lid={params.id} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        ) : (

                            <TableRow >
                                <TableCell colSpan={7} className="text-sm">
                                    <p className=' text-center'>No Templates Found. Create One.</p>
                                </TableCell>
                            </TableRow>

                        )}

                    </TableBody>
                </Table>
            </TablePageContent>
            <TablePageFooter>
                <div className="p-2">   </div>
            </TablePageFooter>
        </TablePage>

    )
}

function RemoveContract({ id, editable, lid }: { id: number, editable: boolean, lid: string }) {
    const [loading, setLoading] = useState(false);
    async function onDelete(id: number) {
        if (!id) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/contracts/${id}`, {
                method: "DELETE",
            })
        )
        setLoading(false);
        if (error && !result) {
            toast.error(error.message);
        }
    }

    return (
        <Button variant={"ghost"} size={"icon"}
            className="size-6 hover:bg-foreground/5 text-foreground/50 rounded-sm"
            disabled={!editable}
            onClick={(e) => { onDelete(id) }}
        >
            {loading ? <Loader2Icon className="size-3 animate-spin" /> : <Trash2Icon className="size-3" />}
        </Button>
    )
}
