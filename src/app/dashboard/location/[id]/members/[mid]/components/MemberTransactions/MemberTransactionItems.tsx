'use client'

import { Badge, Button } from '@/components/ui'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from '@/components/ui/item'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberTransactions } from '@/hooks/hooks'
import { formatAmountForDisplay } from '@/libs/utils'
import { Transaction } from '@/types'
import { CircleDollarSign, FileIcon } from 'lucide-react'
import { TransactionItem } from './TransactionItem'

export const MemberTransactionItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const { transactions, isLoading, error, mutate } = useMemberTransactions(
        params.id,
        params.mid
    )

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-16 " />
                <Skeleton className="w-full h-16 " />
            </div>
        )
    }

    const renderTransactions = () => {
        return transactions.map((transaction: Transaction) => (
            <li key={transaction.id}>
                <TransactionItem transaction={transaction} params={params} />
            </li>
        ))
    }

    return (
        <div>
            <div className="flex flex-row items-center justify-between gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Transactions
                </h2>
            </div>
            <ScrollArea className="max-h-[350px] w-full">
                {transactions && transactions.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {renderTransactions()}
                    </ul>
                )}
            </ScrollArea>
        </div>
    )
}
