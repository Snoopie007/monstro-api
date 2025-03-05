
import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { ProgramLevel, ProgramSession } from '@/types'
import { UpsertLevel } from './UpdateLevel'
import { useState } from 'react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'


interface LevelActionsProps {
    level: ProgramLevel
    lid: string
}

export default function LevelActions({ level, lid }: LevelActionsProps) {
    const [currentLevel, setCurrentLevel] = useState<ProgramLevel | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    function isDisabled() {
        if (!level || !level.sessions) return true
        return level.sessions.filter((session: ProgramSession) => {
            return session.reservations && session.reservations.length > 0
        }).length > 0
    }
    async function onDelete(sid: number) {
        if (!sid) return
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/programs/session`, {
                method: 'DELETE',
                body: JSON.stringify({ sessionId: sid })
            })
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to delete session')
        }
    }
    return (
        <div>
            <UpsertLevel level={currentLevel} setCurrentLevel={setCurrentLevel} lid={lid} />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                        <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>

                    <DropdownMenuItem className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                        onClick={() => setCurrentLevel(level)}
                    >
                        <span>Edit</span>

                    </DropdownMenuItem>
                    <DropdownMenuSeparator className='mb-2' />
                    <DropdownMenuItem
                        className='cursor-pointer bg-red-500 children:'
                        onClick={() => onDelete(level.id)}
                        disabled={isDisabled()}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Delete</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
