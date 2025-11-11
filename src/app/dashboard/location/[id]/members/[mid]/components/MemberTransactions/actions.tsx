import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator,
} from '@/components/ui'
import { tryCatch } from '@/libs/utils'
import { Transaction } from '@/types/transaction'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'react-toastify'

interface MemberPaymentActionsProps {
    transaction: Transaction
    mid: string
    lid: string
}

export default function MemberPaymentActions({
    transaction,
    mid,
    lid,
}: MemberPaymentActionsProps) {
    async function makeARefund(id: string | undefined) {
        if (!id) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${mid}/transactions`, {
                method: 'PUT',
                body: JSON.stringify({ chargeId: id }),
            })
        )
        if (error) {
            toast.error('Something went wrong, please try again later');
            return;
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
                    disabled={transaction.status === 'incomplete'}
                    onClick={() => makeARefund(transaction.metadata?.chargeId)}
                >
                    Refund
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
