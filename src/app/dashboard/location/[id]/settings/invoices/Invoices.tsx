import React from 'react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui";
import { formatAmountForDisplay } from "@/libs/utils";
import { format } from "date-fns";
import { DownloadCloudIcon } from "lucide-react";
import Stripe from "stripe";


export default function Invoices({ invoices }: { invoices: Stripe.Invoice[] }) {
    return (
        <div className="bg-foreground/5 rounded-lg">
            <Table >
                <TableHeader >
                    <TableRow className='border-foreground/5'>
                        {['ID', 'Date', 'Status', 'Amount', 'Invoice'].map((header, i) => (
                            <TableHead key={i}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="py-3  text-center">No invoices found</TableCell>
                        </TableRow>
                    )}
                    {invoices?.map((invoice, index) => (
                        <TableRow key={index} className='border-foreground/5' >
                            <TableCell>{invoice.id}</TableCell>
                            <TableCell >{format(invoice.created * 1000, 'MMM d, yyyy')}</TableCell>

                            <TableCell >{formatAmountForDisplay(invoice.total / 100, 'usd', true)}</TableCell>
                            <TableCell >
                                <Badge member={invoice.status === 'paid' ? 'active' : 'inactive'}>{invoice.status}</Badge>
                            </TableCell>
                            <TableCell className="flex justify-start ">
                                <Button variant="ghost" size="icon" className="size-8">
                                    <DownloadCloudIcon className="size-5" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

        </div>
    )
}
