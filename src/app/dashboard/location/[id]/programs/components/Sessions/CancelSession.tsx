"use client"
import { useState } from "react"
import { tryCatch } from "@/libs/utils"
import { toast } from "react-toastify"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui"
import { AlertTriangle, Loader2 } from "lucide-react"
import { ProgramSession } from "@/types"

interface CancelSessionProps {
    session: ProgramSession
    lid: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onRefetch?: () => void
}
export function CancelSession({ session, lid, open, onOpenChange, onRefetch }: CancelSessionProps) {
    const [loading, setLoading] = useState(false)
    const isHardDelete = (session.reservationsCount ?? 0) === 0

    async function handleCancel() {
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${session.programId}/sessions/${session.id}`, { method: 'DELETE', })
        )
        setLoading(false)

        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to delete session')
        } else {
            toast.success('Session deleted successfully')
            onOpenChange(false)
            onRefetch?.()
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="border-foreground/10">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {isHardDelete && <AlertTriangle className="size-5 text-destructive" />}
                        {isHardDelete ? 'Delete Session Permanently' : 'Cancel Session'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isHardDelete ? (
                            <span>
                                This session has no reservations and will be permanently deleted. This action cannot be undone.
                            </span>
                        ) : (
                            'This will cancel the session starting from today and all future sessions.'
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleCancel} 
                        disabled={loading}
                        className={isHardDelete ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : isHardDelete ? 'Delete Permanently' : 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}