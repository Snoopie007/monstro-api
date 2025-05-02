'use client'
import { TableBody, TableHeader, TableCell, TableRow, Table, TableHead } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { Input } from "@/components/forms"
import { useMemberInvoices } from "@/hooks"
import { format } from "date-fns"
import { Badge } from "@/components/ui"
import { MemberInvoice } from "@/types/member"
import { formatAmountForDisplay } from "@/libs/utils"

export function MemberInvoices({ params }: { params: { id: string, mid: number } }) {
    const { invoices, isLoading, error } = useMemberInvoices(params.id, params.mid)
    return (
        <div className='space-y-2'>
            <div className='w-full flex flex-row items-center px-4  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search invoices...' className='w-[250px] text-xs h-8 py-2 rounded-xs' />
                </div>
                <div>

                </div>
            </div>
            <div className='border-y'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {["ID", "Description", "Total", "Date", "Status", ''].map((header, index) => (
                                <TableHead key={index} className='text-xs h-auto py-2'>
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <>
                                <TableRow >
                                    {Array.from({ length: 4 }).map((_, i) => {
                                        return (
                                            <TableCell key={i}>
                                                <Skeleton className="w-full h-4 bg-gray-100" />
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            </>
                        ) : (
                            <>
                                {invoices && invoices.length > 0 ? (
                                    invoices.map((invoice: MemberInvoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>
                                                {invoice.id}
                                            </TableCell>
                                            <TableCell>
                                                {invoice.description}
                                            </TableCell>

                                            <TableCell>
                                                {formatAmountForDisplay(invoice.total / 100, invoice.currency!)}

                                            </TableCell>
                                            <TableCell>
                                                {format(invoice.created!, "MMM d, yyyy, h:mm a")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge size="tiny" inv={invoice.status}>{invoice.status}</Badge>
                                            </TableCell>

                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            No invoices found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
