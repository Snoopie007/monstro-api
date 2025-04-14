import React from 'react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui";
import { formatAmountForDisplay } from "@/libs/utils";
import { format } from "date-fns";
import { DownloadCloudIcon } from "lucide-react";
import Stripe from "stripe";


export default function Invoices({ invoices }: { invoices: Stripe.Invoice[] }) {
    return (
        <div className="border rounded-sm">
            <Table >
                <TableHeader>
                    <TableRow>
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
                        <TableRow key={index} >
                            <TableCell className="py-3">{invoice.id}</TableCell>
                            <TableCell className="py-3">{format(invoice.created * 1000, 'MMM d, yyyy')}</TableCell>

                            <TableCell className="py-3">{formatAmountForDisplay(invoice.total / 100, 'usd', true)}</TableCell>
                            <TableCell className="py-3">
                                <Badge variant={invoice.status === 'paid' ? 'active' : 'inactive'}>{invoice.status}</Badge>
                            </TableCell>
                            <TableCell className="text-center py-3">
                                <Button variant="foreground" size="icon" className="size-6">
                                    <DownloadCloudIcon className="size-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

        </div>
    )
}
