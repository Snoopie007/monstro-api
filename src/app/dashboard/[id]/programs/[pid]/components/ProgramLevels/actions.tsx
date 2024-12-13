
import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { enrollments } from '@/db/schemas'
import { Level, Session } from '@/types'


interface LevelActionsProps {
    level: Level | null
    onChange: (level: Level | null) => void
    onDelete: (id: number) => void
}

export default function LevelActions({ level, onChange, onDelete }: LevelActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                    <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>

                <DropdownMenuItem
                    onClick={() => onChange(level)}
                    className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                >

                    <span>Edit</span>

                </DropdownMenuItem>
                <DropdownMenuSeparator className='mb-2' />
                <DropdownMenuItem className='cursor-pointer bg-red-500 ' 
                onClick={() => onDelete(level && level.id ? level.id : 0)}
                disabled={level && level.sessions ? level.sessions.filter((session: Session) => {
                        if(session.status) {
                            return session.enrollments?.length ? session.enrollments?.filter((enrollment) => enrollment.status === 1).length > 0 : false
                        }
                        return false
                    }).length > 0 : true}
                    >
                    <span>Delete</span>

                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
