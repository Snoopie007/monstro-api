import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
} from '@/components/ui'
import { Transaction } from '@subtrees/types/transaction'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'react-toastify'
import { useSession } from '@/hooks/useSession'
import { clientsideApiClient } from '@/libs/api/client'
import { useMemo } from 'react'

interface MemberPaymentActionsProps {
    transaction: Transaction
    lid: string
    onRefunded?: () => void
}

export default function MemberPaymentActions({
    transaction,
    lid,
    onRefunded,
}: MemberPaymentActionsProps) {
    const { data: session } = useSession()
    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null
        return clientsideApiClient(session.user.sbToken)
    }, [session?.user?.sbToken])

    async function makeARefund() {
        if (!api) {
            toast.error('Session not ready. Please try again.')
            return
        }

        try {
            const endpoint = transaction.paymentType === 'cash'
                ? `/x/loc/${lid}/transactions/${transaction.id}/refund/cash`
                : `/x/loc/${lid}/transactions/${transaction.id}/refund`

            await api.post(endpoint, {
                amountType: 'full',
            })
            toast.success(transaction.paymentType === 'cash'
                ? 'Cash refund recorded successfully'
                : 'Refund processed successfully')
            onRefunded?.()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong, please try again later'
            if (message.includes('SUBSCRIPTION_REFUND_BLOCKED') || message.includes('Please cancel the subscription instead to refund')) {
                toast.error('Please cancel the subscription instead to refund')
                return
            }
            toast.error(message)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={'ghost'}
                    className="h-auto py-0 px-0 hover:bg-transparent"
                >
                    <EllipsisVertical size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px] border-foreground/20 p-2">
                <DropdownMenuItem
                    className="cursor-pointer bg-red-500 hover:bg-red-800 text-white font-semibold "
                    disabled={transaction.status !== 'paid' || transaction.refunded}
                    onClick={makeARefund}
                >
                    Refund
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
