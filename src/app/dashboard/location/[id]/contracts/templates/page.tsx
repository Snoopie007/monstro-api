'use client';;
import { use } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CreateContract } from './components';
import { useContracts } from '@/hooks/useContracts';
import SectionLoading from '@/components/SectionLoading';
import { Icon } from '@/components/icons';
import Link from 'next/link';
import { Badge } from "@/components/ui";
import { TablePageHeader } from "@/components/ui/TablePage";
import { TablePageHeaderTitle } from "@/components/ui/TablePage";
import { TablePageHeaderSection } from "@/components/ui/TablePage";
import { TablePage, TablePageContent, TablePageFooter } from "@/components/ui/TablePage";
import { format } from "date-fns";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";

export default function ContractTemplatesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading, error } = useContracts(params.id);

    async function onDelete(id: number) {
        if (!id) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/contracts/${id}`, {
                method: "DELETE",
            })
        )
        if (error) {
            toast.error(error.message);
        }
    }
    if (contracts) {

        return (
            <TablePage>
                <TablePageHeader>
                    <TablePageHeaderTitle>Contract Templates</TablePageHeaderTitle>
                    <TablePageHeaderSection>
                        <CreateContract locationId={params.id} />
                    </TablePageHeaderSection>
                </TablePageHeader>
                <TablePageContent>
                    <>
                        {isLoading || error ? (
                            <SectionLoading />
                        ) : (
                            <Table className=" w-auto border border-foreground/10 ">
                                <TableHeader className=" text-xs">
                                    <TableRow  >
                                        {["Title", "Plans", "Created", "Type", "Status", "Editable", 'Require Signature', ""].map((title) => (
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
                                                    <TableCell className="text-sm ">
                                                        {contract.editable ? (
                                                            <Link href={`/builder/${params.id}/contract/${contract.id}`}>{contract.title ? contract.title : "No Title"}</Link>
                                                        ) : (
                                                            contract.title
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm ">
                                                        {contract.plans?.length}
                                                    </TableCell>
                                                    <TableCell className="text-sm ">
                                                        {format(contract.created, "MM/dd/yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-sm capitalize ">
                                                        {contract.type}
                                                    </TableCell>
                                                    <TableCell className="text-sm ">
                                                        {contract.isDraft ? (
                                                            <Badge className="bg-yellow-300  text-black rounded-xs"> Draft</Badge>
                                                        ) : (
                                                            <Badge className="bg-green-300  text-black rounded-xs">Active</Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-sm ">
                                                        {contract.editable ? (
                                                            <Badge className="bg-green-300  text-black rounded-xs">Yes</Badge>
                                                        ) : (
                                                            <Badge className="bg-red-300  text-black rounded-xs">No</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm ">
                                                        {contract.requireSignature ? (
                                                            <Badge className="bg-green-300  text-black rounded-xs">Yes</Badge>
                                                        ) : (
                                                            <Badge className="bg-red-300  text-black rounded-xs">No</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm ">
                                                        <button className={contract.editable ? `` : `disabled:opacity-50`} disabled={!contract.editable} onClick={(e) => { onDelete(contract.id) }}>
                                                            <Icon name="Trash2" size={16} className="cursor-pointer stroke-red-500" />
                                                        </button>
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
                        )
                        }

                    </>
                </TablePageContent>
                <TablePageFooter>
                    <div className="p-2">   </div>
                </TablePageFooter>
            </TablePage>

        )

    }
}
