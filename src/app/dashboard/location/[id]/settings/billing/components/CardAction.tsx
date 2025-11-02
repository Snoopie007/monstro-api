
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { tryCatch } from '@/libs/utils'
import { EllipsisVerticalIcon } from 'lucide-react'
import Stripe from 'stripe'



interface CardActionsProps {
    paymentMethod: Stripe.PaymentMethod | null
    locationId: string
}

export default function CardActions({ paymentMethod, locationId }: CardActionsProps) {

    async function remove() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/config/card/remove`, {
                method: "POST",
                body: JSON.stringify({ paymentMethodId: paymentMethod?.id })
            })
        )
    }
    async function makeDefault() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/config/card/make-default`, {
                method: "POST",
                body: JSON.stringify({ paymentMethodId: paymentMethod?.id })
            })
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto py-0 px-0 hover:bg-transparent'>
                    <EllipsisVerticalIcon className='size-4' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>

                <DropdownMenuItem

                    className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                >

                    <span>Default</span>

                </DropdownMenuItem>
                <DropdownMenuSeparator className='mb-2' />
                <DropdownMenuItem className='cursor-pointer bg-red-500 '>

                    <span>Remove</span>

                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}



