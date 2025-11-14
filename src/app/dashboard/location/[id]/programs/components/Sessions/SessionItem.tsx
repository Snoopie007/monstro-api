'use client'
import { StaffRowData } from '@/hooks/useStaffs'
import { ProgramSession } from '@/types'
import { useCallback, useState } from 'react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { addMinutes, format } from 'date-fns'
import { Loader2, MoreVertical, Trash2 } from 'lucide-react'
import {
    Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    AlertDialog, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
    AlertDialogAction
} from '@/components/ui'

interface SessionItemProps {
    session: ProgramSession
    lid: string
    availableStaff: StaffRowData[]
}
const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";

export default function SessionItem({ session, lid }: SessionItemProps) {
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
            <CancelSession session={session} lid={lid} open={openCancel} onOpenChange={setOpenCancel} />
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


interface CancelSessionProps {
    session: ProgramSession
    lid: string
    open: boolean
    onOpenChange: (open: boolean) => void
}
function CancelSession({ session, lid, open, onOpenChange }: CancelSessionProps) {
    const [loading, setLoading] = useState(false)
    const PATH = `/api/protected/loc/${lid}/programs/${session.programId}/sessions/${session.id}`
    async function handleCancel() {

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(PATH, { method: 'DELETE', })
        )
        setLoading(false)

        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to delete session')
        } else {
            toast.success('Session deleted successfully')
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>

            <AlertDialogContent className="border-foreground/10">
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Session</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will primary cancel the session for starting from today and all future sessions.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={loading}>

                        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}