import React from 'react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui";
import { formatAmountForDisplay } from "@/libs/utils";
import { format } from "date-fns";
import { DownloadCloudIcon } from "lucide-react";
import Stripe from "stripe";


export default function Charges({ charges }: { charges: Stripe.Charge[] }) {
    return (
        <div className="border rounded-sm">
            <Table >
                <TableHeader>
                    <TableRow>
                        {['ID', 'Date', 'Status', 'Amount'].map((header, i) => (
                            <TableHead key={i}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {charges.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="py-3  text-center">No charges found</TableCell>
                        </TableRow>
                    )}
                    {charges?.map((charge, index) => (
                        <TableRow key={index} >
                            <TableCell className="py-3">{charge.id}</TableCell>
                            <TableCell className="py-3">{format(charge.created * 1000, 'MMM d, yyyy')}</TableCell>

                            <TableCell className="py-3">{formatAmountForDisplay(charge.amount / 100, 'usd', true)}</TableCell>
                            <TableCell className="py-3">
                                <Badge variant={charge.status === 'succeeded' ? 'active' : 'inactive'}>{charge.status}</Badge>
                            </TableCell>

                        </TableRow>
                    ))}
                </TableBody>
            </Table>

        </div>
    )
}
