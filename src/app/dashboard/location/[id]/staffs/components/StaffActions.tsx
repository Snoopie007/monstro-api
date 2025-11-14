
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { Staff } from '@/types'
import { EllipsisVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StaffActionsProps {
    staff?: Staff | null
    onChange: (staff: any) => void,
    deleteFunction: Function,
    lid: string
}

export function StaffActions({ staff, lid }: StaffActionsProps) {
    const router = useRouter();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                    <EllipsisVertical size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20'>

                <DropdownMenuItem onClick={() => {
                    router.push(`/dashboard/location/${lid}/staffs/${staff?.id}`);
                }} className='cursor-pointer'>

                    <span>Profile</span>

                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer ' onClick={() => { }}>

                    <span>Remove</span>

                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
