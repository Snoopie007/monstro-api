import { Badge } from '@/components/ui'
import {
    Item,
    ItemMedia,
    ItemContent,
    ItemActions,
} from '@/components/ui'
import { formatAmountForDisplay } from '@/libs/utils'
import { Transaction } from '@/types'
import { format } from 'date-fns'
import MemberPaymentActions from './actions'

interface TransactionItemProps {
    transaction: Transaction
    params: { id: string; mid: string }
}

export function TransactionItem({ transaction, params }: TransactionItemProps) {
    return (
        <Item variant="muted" className='p-3'>
            <ItemMedia>
                <Badge transaction={transaction.status} className="capitalize">
                    {transaction.status}
                </Badge>
            </ItemMedia>
            <ItemContent className='flex flex-row justify-between gap-2 items-center'>

                <span className='font-medium'>
                    {formatAmountForDisplay(transaction.amount / 100, transaction.currency || 'usd', true)}
                </span>
                <span>
                    {transaction.paymentMethod === 'card' &&
                        transaction.metadata?.card ? (
                        <div className="flex flex-row items-center gap-1">
                            <span className="capitalize">
                                {transaction.metadata?.card?.brand}
                            </span>
                            <span>
                                ••••{' '}
                                {transaction.metadata?.card &&
                                    transaction.metadata?.card.last4}
                            </span>
                        </div>
                    ) : (
                        <span className="capitalize">
                            {transaction.paymentMethod}
                        </span>
                    )}
                </span>
                <span className='font-medium'>
                    {format(transaction.created, 'MMM d, yyyy')}
                </span>
            </ItemContent>
            <ItemActions>
                <MemberPaymentActions
                    transaction={transaction}
                    mid={params.mid}
                    lid={params.id}
                />
            </ItemActions>
        </Item>
    )
}
