'use client'

import { ScrollArea } from '@/components/ui/ScrollArea'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberTransactions } from '@/hooks/hooks'
import { Transaction } from '@/types'
import { TransactionItem } from './TransactionItem'

interface MemberTransactionsProps {
    params: { id: string; mid: string }
}
export function MemberTransactions({ params }: MemberTransactionsProps) {
    const { transactions, isLoading, error, mutate } = useMemberTransactions(
        params.id,
        params.mid
    )



    return (
        <div>
            <div className="flex flex-row items-center justify-between gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Transactions
                </h2>
            </div>
            <ScrollArea className="max-h-[350px] w-full">
                {transactions && transactions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {transactions.map((transaction: Transaction) => (
                            <TransactionItem key={transaction.id} transaction={transaction} params={params} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-muted-foreground">No transactions found</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}