
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Button } from '@/components/ui'
import { Role } from '@/types'
import { DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu'
import { EllipsisVerticalIcon, Trash2 } from 'lucide-react'

export default function RoleListActions({ role, deleteFunction }: { role: Role, deleteFunction: Function }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} size="icon" className='size-8 '>
                    <EllipsisVerticalIcon className='size-5' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[150px]'>

                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer bg-red-500 flex flex-row items-center justify-between' onClick={() => deleteFunction(role.id)}>

                    <span>Delete</span>
                    <Trash2 className='size-4' />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
