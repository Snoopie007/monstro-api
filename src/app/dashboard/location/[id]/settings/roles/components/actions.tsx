
import { Icon } from '@/components/icons'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Button } from '@/components/ui'
import { Role } from '@/types'
import { DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu'

export default function RoleListActions({ role, deleteFunction }: { role: Role, deleteFunction: Function }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[150px]'>

                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer bg-red-500 flex flex-row items-center justify-between' onClick={() => deleteFunction(role.id)}>

                    <span>Delete</span>
                    <Icon name="Trash2" size={16} className="" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
