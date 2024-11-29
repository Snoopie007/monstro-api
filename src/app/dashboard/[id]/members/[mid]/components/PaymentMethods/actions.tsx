
import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { del, put } from '@/libs/api'
import Stripe from 'stripe';

interface PaymentMethodActionsProps {
    paymentMethod: Stripe.PaymentMethod | null,
    memberId: number,
    customerId: string,
    locationId: string,
}

export default function PaymentMethodsActions({ paymentMethod, memberId, locationId, customerId }: PaymentMethodActionsProps) {
    async function detachPaymentMethod(id: string) {
        await del({ url: `members/${memberId}/payments/method?paymentMethodId=${id}`, id: locationId });
    }

    async function makeDefualtPaymentMethod(id: string) {
        await put({ url: `members/${memberId}/payments/method`, data: { paymentMethodId: id, customerId: customerId }, id: locationId });
    }


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto py-0 px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>
                {paymentMethod && (
                    <>
                        <DropdownMenuItem className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5' onClick={() => makeDefualtPaymentMethod(paymentMethod.id)}>
                            <span>Default</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className='mb-2' />
                        <DropdownMenuItem className='cursor-pointer bg-red-500 ' onClick={() => detachPaymentMethod(paymentMethod.id)}>

                            <span>Remove</span>

                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}



