import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { put } from '@/libs/api';
import Stripe from 'stripe';

interface MemberPaymentActionsProps {
    payment: Stripe.Charge,
    memberId: number,
    locationId: string
}

export default function MemberPaymentActions({ payment, memberId, locationId }: MemberPaymentActionsProps) {

    async function makeARefund(id: string) {
        await put({ url: `members/${memberId}/payments`, data: { chargeId: id }, id: locationId });
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
                    disabled={(payment.status === 'failed')}
                    onClick={() => makeARefund(payment.id)}
                >
                    Refund
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
