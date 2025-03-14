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
        return level.sessions.some((session: ProgramSession) => 
            session.reservations && session.reservations.length > 0
        )
    }

    async function onDelete(lid: number) {
        if (!lid) return

        setLoading(true) 
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${level?.programId}/levels/${level?.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ levelId: lid })
            })
        )
        setLoading(false) 

        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to delete session')
        } else {
            toast.success('Session deleted successfully')
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
                    <DropdownMenuItem
                        className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                        onClick={() => setCurrentLevel(level)}
                    >
                        <span>Edit</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className='mb-2' />

                    <DropdownMenuItem
                        className='cursor-pointer bg-red-500'
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
