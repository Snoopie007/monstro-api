'use client'

import {
    Item, ItemMedia, ItemContent, ItemTitle,
    Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
    Button
} from '@/components/ui'
import { useMemberTransactions } from '@/hooks/hooks'
import { Transaction } from '@subtrees/types'
import { TransactionItem } from './TransactionItem'
import { CircleFadingPlusIcon } from 'lucide-react'

interface MemberTransactionsProps {
    params: { id: string; mid: string }
}
export function MemberTransactions({ params }: MemberTransactionsProps) {
    const { transactions, isLoading, error, mutate } = useMemberTransactions(
        params.id,
        params.mid
    )

    return (
        <div className="space-y-2">

            {/* <Item variant="outline" size="sm" className="border-foreground/10 border-dashed cursor-pointer" >
                <ItemMedia>
                    <CircleFadingPlusIcon className="size-5" />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle> Create a transaction</ItemTitle>
                </ItemContent>
            </Item> */}
            {transactions && transactions.length > 0 ? (
                <div className="space-y-2">
                    {transactions.map((transaction: Transaction) => (
                        <TransactionItem
                            key={transaction.id}
                            transaction={transaction}
                            params={params}
                            onRefunded={() => mutate()}
                        />
                    ))}
                </div>
            ) : (

                <Empty variant="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CircleFadingPlusIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No transactions found</EmptyTitle>
                        <EmptyDescription>Transactions will appear here when they occur</EmptyDescription>
                    </EmptyHeader>

                </Empty>
            )}
        </div>
    )
}
