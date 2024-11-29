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

export default function ContractTemplatesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { contracts, isLoading, error } = useContracts(params.id);
    if (contracts) {

        return (
            <div className='max-w-4xl  py-4 m-auto'>
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
                                            {["Title", "Plans", "Created", "Status", "Editable"].map((title) => (
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
                                                        <TableCell className="text-sm py-4 px-6 font-roboto">
                                                            {contract.editable ? (
                                                                <Link href={`/builder/${params.id}/contract/${contract.id}`}>{contract.title ? contract.title : "No Title"}</Link>
                                                            ) : (
                                                                contract.title
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm py-4 px-6 font-roboto">
                                                            {contract.stripe_plans?.length}
                                                        </TableCell>
                                                        <TableCell className="text-sm py-4 px-6 font-roboto">
                                                            {formatDateTime(contract.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-sm py-4 px-6 font-roboto">
                                                            {contract.isDraft ? "Draft" : "Publish"}
                                                        </TableCell>
                                                        <TableCell className="text-sm py-4 px-6 font-roboto">
                                                            {contract.editable ? <Icon name='Check' /> : <Icon name='X' />}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        ) : (

                                            <TableRow >
                                                <TableCell colSpan={7} className="text-sm py-4 px-6 font-roboto">
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
