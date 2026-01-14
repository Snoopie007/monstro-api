import { Badge } from '@/components/ui'
import {
    Item,
    ItemMedia,
    ItemContent,
    ItemActions,
} from '@/components/ui'
import { formatAmountForDisplay } from '@/libs/utils'
import { PaymentType, Transaction } from '@/types'
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
                    {formatAmountForDisplay(transaction.total / 100, transaction.currency || 'usd', true)}
                </span>
                <span>
                    {TransactionType({ transaction })}
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
        </Item >
    )
}


function TransactionType({ transaction }: { transaction: Transaction }) {
    switch (transaction.paymentType) {
        case 'card':
            const card = transaction.metadata?.card;
            if (!card) {
                return null;
            }
            return (
                <div className="flex flex-row items-center gap-1">
                    <span className="capitalize">
                        {card.brand}
                    </span>
                    <span>
                        {'•••• ' + card.last4}
                    </span>
                </div>
            )
        case 'us_bank_account':
            const bank = transaction.metadata?.us_bank_account;
            if (!bank) {
                return null;
            }
            return (
                <div className="flex flex-row items-center gap-1">
                    <span className="capitalize">
                        {bank.bank_name}
                    </span>
                    <span>
                        {'•••• ' + bank.last4}
                    </span>
                </div>
            )
        default:
            return (
                <span className="capitalize">
                    {transaction.paymentType}
                </span>
            )
    }
}