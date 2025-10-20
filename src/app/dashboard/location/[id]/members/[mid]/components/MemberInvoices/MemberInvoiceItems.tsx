'use client'

import { Badge, Button, ScrollArea, Skeleton } from '@/components/ui'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from '@/components/ui/item'
import { useMemberInvoices } from '@/hooks'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberInvoice } from '@/types'
import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InvoiceDetailDialog } from './InvoiceDetailDialog'

export const MemberInvoiceItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const router = useRouter()
    const { invoices, isLoading, error, mutate } = useMemberInvoices(
        params.id,
        params.mid
    )
    const [selectedInvoice, setSelectedInvoice] =
        useState<MemberInvoice | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleCreateInvoice = () => {
        router.push(
            `/dashboard/location/${params.id}/members/${params.mid}/invoices/new`
        )
    }

    const handleViewInvoice = (invoice: MemberInvoice) => {
        setSelectedInvoice(invoice)
        setDialogOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-16 " />
                <Skeleton className="w-full h-16 " />
            </div>
        )
    }

    return (
        <>
            <div className="mb-4">
                <div className="flex flex-row items-center justify-between gap-2 mb-2">
                    <h2 className="text-md text-muted-foreground font-medium">
                        Invoices
                    </h2>
                    <Button
                        onClick={handleCreateInvoice}
                        className="dark:text-muted-foreground"
                        variant={'link'}
                        size={'sm'}
                    >
                        + Create Manual Invoice
                    </Button>
                </div>
                <ScrollArea className="max-h-[350px] w-full">
                    <ul className="flex flex-col gap-2">
                        {invoices && invoices.length > 0 ? (
                            invoices.map((invoice: MemberInvoice) => (
                                <li key={invoice.id}>
                                    <Item
                                        variant="muted"
                                        className="hover:bg-muted-foreground/5"
                                    >
                                        <ItemContent>
                                            <ItemTitle>
                                                {formatAmountForDisplay(
                                                    invoice.total / 100,
                                                    invoice.currency!
                                                )}
                                                {' • '}
                                                <span className="text-muted-foreground text-xs">
                                                    {invoice.id.slice(0, 7)}...
                                                    {invoice.id.slice(-4)}
                                                </span>
                                            </ItemTitle>
                                            <ItemDescription className="text-muted-foreground text-sm">
                                                <Badge
                                                    inv={invoice.status}
                                                    className="capitalize"
                                                >
                                                    {invoice.status}
                                                </Badge>
                                                {invoice.description && ' • '}
                                                {invoice.description?.slice(
                                                    0,
                                                    20
                                                )}
                                                ...
                                                {invoice.created && ' • '}
                                                {invoice.created &&
                                                    format(
                                                        invoice.created,
                                                        'MMM d, yyyy'
                                                    )}
                                            </ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewInvoice(invoice)
                                                }
                                            >
                                                View
                                            </Button>
                                        </ItemActions>
                                    </Item>
                                </li>
                            ))
                        ) : (
                            <li>No invoices found</li>
                        )}
                    </ul>
                </ScrollArea>
            </div>

            <InvoiceDetailDialog
                invoice={selectedInvoice}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}
