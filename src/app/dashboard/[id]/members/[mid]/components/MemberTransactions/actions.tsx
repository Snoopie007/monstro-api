import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { tryCatch } from '@/libs/utils';
import { Transaction } from '@/types/transaction';

interface MemberPaymentActionsProps {
    transaction: Transaction,
    memberId: number,
    locationId: string
}

export default function MemberPaymentActions({ transaction, memberId, locationId }: MemberPaymentActionsProps) {

    async function makeARefund(id: number) {


        const { result, error } = await tryCatch(
            fetch(`/api/protected/${locationId}/members/${memberId}/transactions`, {
                method: 'PUT',
                body: JSON.stringify({ chargeId: id })
            })
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto py-0 px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>
                <DropdownMenuSeparator className='mb-2' />
                <DropdownMenuItem
                    className='cursor-pointer bg-red-500 hover:bg-red-800 text-white font-semibold '
                    disabled={(transaction.status === 'past_due')}
                    onClick={() => makeARefund(transaction.id)}
                >
                    Refund
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
