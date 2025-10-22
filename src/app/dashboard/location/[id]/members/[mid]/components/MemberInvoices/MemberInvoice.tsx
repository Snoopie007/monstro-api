'use client'

import { Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger, CardTitle } from '@/components/ui'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemMedia,
} from '@/components/ui/item'
import { useMemberInvoices } from '@/hooks'
import { formatAmountForDisplay } from '@/libs/utils'
import type { MemberInvoice } from '@/types'
import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, FileText, EllipsisVerticalIcon } from 'lucide-react'


interface MemberInvoiceProps {
    params: { id: string; mid: string }
}
export function MemberInvoice({ params }: MemberInvoiceProps) {
    const [open, setOpen] = useState<boolean>(true)
    const router = useRouter()

    const { invoices } = useMemberInvoices(params.id, params.mid)


    const handleCreateInvoice = () => {
        router.push(`/dashboard/location/${params.id}/invoices/new`)
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className='space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>Invoices</CardTitle>
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
                <Button
                    onClick={handleCreateInvoice}
                    size={'icon'}
                    variant={'ghost'}
                    className="size-6  text-lg"
                >
                    +
                </Button>
            </div>
            <CollapsibleContent>
                {invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                        {invoices.map((invoice: MemberInvoice) => (
                            <InvoiceItem
                                key={invoice.id}
                                invoice={invoice}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="flex flex-col items-center justify-center">
                            <FileText
                                size={40}
                                className="text-muted-foreground mb-3"
                            />
                            <p className="text-md mb-1">No invoices found</p>
                            <p className="text-sm text-muted-foreground">
                                Create an invoice to get started
                            </p>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>

    )
}



function InvoiceItem({ invoice }: { invoice: MemberInvoice }) {
    return (
        <Item variant="muted" className='p-3 '>
            <ItemMedia>
                <Badge inv={invoice.status} className="capitalize">
                    {invoice.status}
                </Badge>


            </ItemMedia>
            <ItemContent className='flex flex-row justify-between gap-2 items-center'>

                <span>
                    {invoice.description?.substring(0, 30)}
                </span>
                <span className='font-medium'>
                    {formatAmountForDisplay(invoice.total / 100, invoice.currency || 'usd', true)}
                </span>
                <span className='font-medium'>
                    {format(invoice.created, 'MMM d, yyyy')}
                </span>
            </ItemContent>
            <ItemActions>
                <Button variant="ghost" size="icon" className="size-6 ">
                    <EllipsisVerticalIcon className="size-4" />
                </Button>
            </ItemActions>
        </Item>
    )
}