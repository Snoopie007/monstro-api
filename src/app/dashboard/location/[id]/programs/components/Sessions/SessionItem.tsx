'use client'
import { ProgramSession, Staff } from '@/types'
import { useCallback, useState } from 'react'
import { CancelSession } from './CancelSession'
import { addMinutes, format } from 'date-fns'
import { MoreVertical, Trash2 } from 'lucide-react'
import {
    Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui'

interface SessionItemProps {
    session: ProgramSession
    lid: string
    availableStaff: Staff[]
    onRefetch?: () => void
}
const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";

export default function SessionItem({ session, lid, onRefetch }: SessionItemProps) {
    const [openCancel, setOpenCancel] = useState(false)

    const calculateTime = useCallback((time: string, duration: number) => {
        const [hours, minutes] = time.split(':').map(Number)
        const startTime = new Date()
        startTime.setHours(hours, minutes, 0)
        const endTime = addMinutes(startTime, duration)
        return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
    }, [])



    return (
        <div className="flex text-xs flex-row gap-4 bg-foreground/5 p-2 rounded-lg items-center justify-between min-w-40">
            <CancelSession session={session} lid={lid} open={openCancel} onOpenChange={setOpenCancel} onRefetch={onRefetch} />
            <span>{calculateTime(session.time, session.duration!)}</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-5">
                        <MoreVertical className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="border-foreground/10">
                    <DropdownMenuItem className={ItemBtnStyle} onSelect={() => setOpenCancel(true)}>
                        <span>Cancel Session</span>
                        <Trash2 className="size-3 text-red-500" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu >
        </div >
    )
}