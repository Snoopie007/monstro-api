import { Badge } from '@/components/ui'
import {
    Item,
    ItemMedia,
    ItemDescription,
    ItemTitle,
    ItemContent,
    ItemActions,
} from '@/components/ui/item'
import { formatAmountForDisplay } from '@/libs/utils'
import { Transaction } from '@/types/transaction'
import { CircleDollarSign } from 'lucide-react'
import MemberPaymentActions from './actions'

export const TransactionItem = ({
    transaction,
    params,
}: {
    transaction: Transaction
    params: { id: string; mid: string }
}) => {
    return (
        <Item variant="muted" className="hover:bg-muted-foreground/5">
            <ItemContent>
                <ItemTitle>
                    {formatAmountForDisplay(
                        transaction.amount / 100,
                        transaction.currency,
                        true
                    )}
                </ItemTitle>
                <ItemDescription className="text-muted-foreground text-sm">
                    <Badge
                        transaction={transaction.status}
                        className="capitalize"
                    >
                        {transaction.status}
                    </Badge>
                    {' • '}{' '}
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
                </ItemDescription>
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
