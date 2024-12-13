'use client';;
import { use } from "react";
import { Card, CardContent } from '@/components/ui/card';
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

export default function ContractTemplatesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading, error } = useContracts(params.id);

    async function onDelete(id: number) {
        await del({url: `contracts/${id}`, id: params.id});
    } 
    if (contracts) {

        return (
            <div className='max-w-6xl  py-4 m-auto'>
                <div className='flex flex-row items-center justify-between py-4 mb-4'>
                    <div>
                        <h4 className='text-xl mb-1 font-bold'>Contract Templates</h4>
                        <p className='text-sm text-foreground/80'>Manage and oversee all contracts templates.</p>
                    </div>
                    <div>
                        <CreateContract locationId={params.id} />
                    </div>
                </div>

                <Card className='rounded-sm  '>
                    <CardContent className='p-0'>
                        <div>
                            {isLoading || error ? (
                                <SectionLoading />
                            ) : (
                                <Table className=" w-full ">
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

                        </div>
                    </CardContent>
                </Card>
            </div>
        )

    }
}
