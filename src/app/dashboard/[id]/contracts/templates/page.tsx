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
import { formatDateTime } from '@/libs/utils';
import { CreateContract } from './components';
import { useContracts } from '@/hooks/use-contracts';
import SectionLoading from '@/components/section-loading';
import { Icon } from '@/components/icons';
import Link from 'next/link';
import { Badge } from "@/components/ui";
import { del } from "@/libs/api";
import { TablePageHeader } from "@/components/ui/table-page";
import { TablePageHeaderTitle } from "@/components/ui/table-page";
import { TablePageHeaderSection } from "@/components/ui/table-page";
import { TablePage, TablePageContent, TablePageFooter } from "@/components/ui/table-page";

export default function ContractTemplatesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading, error } = useContracts(params.id);

    async function onDelete(id: number) {
        await del({ url: `contracts/${id}`, id: params.id });
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
                                        {["Title", "Plans", "Created", "Status", "Editable", "Action"].map((title) => (
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
                                                        {formatDateTime(contract.created)}
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
                                                            <div className="group flex flex-row items-center">
                                                                <Icon name='Check' className="inline-block group-hover:hidden " />
                                                                <Link href={`/builder/${params.id}/contract/${contract.id}`} className={"group-hover:inline-block hidden hover:text-indigo-500"}>
                                                                    <Icon name="Pencil" size={14} /></Link>
                                                            </div>
                                                        ) : <Icon name='X' className="text-red-500" />}
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
