
import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { Staff } from '@/types'


interface StaffListProps {
    staff?: Staff | null
    onChange: (staff: any) => void
}

export default function StaffListActions({ staff, onChange }: StaffListProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>

                <DropdownMenuItem
                    onClick={() => onChange(staff)}
                    className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                >

                    <span>Profile</span>

                </DropdownMenuItem>
                <DropdownMenuSeparator className='mb-2' />
                <DropdownMenuItem className='cursor-pointer bg-red-500 '>

                    <span>Remove</span>

                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
