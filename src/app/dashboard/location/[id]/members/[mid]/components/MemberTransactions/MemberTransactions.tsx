'use client'

import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, CardTitle } from '@/components/ui'
import { useMemberTransactions } from '@/hooks/hooks'
import { Transaction } from '@/types'
import { TransactionItem } from './TransactionItem'
import { useState } from 'react'
import { ChevronsUpDown, CreditCard } from 'lucide-react'

interface MemberTransactionsProps {
    params: { id: string; mid: string }
}
export function MemberTransactions({ params }: MemberTransactionsProps) {
    const [open, setOpen] = useState<boolean>(true)
    const { transactions, isLoading, error, mutate } = useMemberTransactions(
        params.id,
        params.mid
    )

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className='space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>Transactions</CardTitle>
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                {transactions && transactions.length > 0 ? (
                    <div className="space-y-2">
                        {transactions.map((transaction: Transaction) => (
                            <TransactionItem key={transaction.id} transaction={transaction} params={params} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="flex flex-col items-center justify-center">
                            <CreditCard
                                size={20}
                                className="text-muted-foreground mb-3"
                            />
                            <p className="text-md mb-1">No transactions found</p>
                            <p className="text-sm text-muted-foreground">
                                Transactions will appear here when they occur
                            </p>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}