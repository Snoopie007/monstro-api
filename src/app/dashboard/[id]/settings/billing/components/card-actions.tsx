
import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import Stripe from 'stripe'



interface CardActionsProps {
    paymentMethod: Stripe.PaymentMethod | null
}

export default function CardActions({ paymentMethod }: CardActionsProps) {



    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto py-0 px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
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



