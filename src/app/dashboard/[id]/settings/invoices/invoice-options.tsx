
'use client'
import { TbDots } from "react-icons/tb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,

    DropdownMenuTrigger,
} from "@/components/ui"
import Link from "next/link";
import { useState } from "react";

export default function InvoiceOptions({ invoiceUrl }: { invoiceUrl: string | null }) {
    console.log(invoiceUrl)
    const [open, setOpen] = useState(false);
    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger><TbDots size={16} /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-center" >
                    {invoiceUrl ? (
                        <Link href={invoiceUrl} className="w-full h-full text-center">View Invoice</Link>
                    ) : (
                        <span className="opacity-70 block text-center w-full h-full">No Invoice</span>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
