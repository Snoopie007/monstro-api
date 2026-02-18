"use client"
import { useState } from "react"
import { tryCatch } from "@/libs/utils"
import { toast } from "react-toastify"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter,
    DialogBody,
    Button,
    Separator,
} from "@/components/ui"
import { Textarea, Checkbox } from "@/components/forms"
import { AlertTriangle, Loader2, Users, CalendarClock } from "lucide-react"
import { ProgramSession } from "@subtrees/types"

interface CancelSessionProps {
    session: ProgramSession
    lid: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onRefetch?: () => void
}

export function CancelSession({ session, lid, open, onOpenChange, onRefetch }: CancelSessionProps) {
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState("")
    const [notifyMembers, setNotifyMembers] = useState(true)
    
    const reservationsCount = session.reservationsCount ?? 0
    const isHardDelete = reservationsCount === 0

    async function handleCancel() {
        setLoading(true)
        
        // Build query params for the enhanced DELETE endpoint
        const params = new URLSearchParams()
        if (notifyMembers) params.set('notify', 'true')
        if (reason) params.set('reason', reason)
        
        const url = `/api/protected/loc/${lid}/programs/${session.programId}/sessions/${session.id}${params.toString() ? `?${params.toString()}` : ''}`
        
        const { result, error } = await tryCatch(
            fetch(url, { method: 'DELETE' })
        )
        setLoading(false)

        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to cancel session')
        } else {
            const data = await result.json()
            const message = isHardDelete 
                ? 'Session deleted successfully'
                : `Session cancelled. ${data.cancelledReservations || 0} reservations affected.`
            toast.success(message)
            setReason("")
            setNotifyMembers(true)
            onOpenChange(false)
            onRefetch?.()
        }
    }

    function handleClose() {
        setReason("")
        setNotifyMembers(true)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="border-foreground/10 max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isHardDelete && <AlertTriangle className="size-5 text-destructive" />}
                        {isHardDelete ? 'Delete Session' : 'Cancel Session'}
                    </DialogTitle>
                    <DialogDescription>
                        {isHardDelete ? (
                            'This session has no reservations and will be permanently deleted.'
                        ) : (
                            'This will cancel the session and notify affected members.'
                        )}
                    </DialogDescription>
                </DialogHeader>
                
                {!isHardDelete && (
                    <DialogBody className="space-y-4">
                        {/* Affected reservations summary */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                <Users className="size-4" />
                                <span className="font-medium">
                                    {reservationsCount} active reservation{reservationsCount !== 1 ? 's' : ''} will be cancelled
                                </span>
                            </div>
                        </div>
                        
                        <Separator className="bg-foreground/10" />
                        
                        {/* Reason input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Reason for cancellation
                                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                            </label>
                            <Textarea
                                placeholder="e.g., Instructor unavailable, facility maintenance..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="resize-none h-20"
                            />
                        </div>
                        
                        {/* Notify members checkbox */}
                        <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
                            <Checkbox
                                id="notify-members"
                                checked={notifyMembers}
                                onCheckedChange={(checked) => setNotifyMembers(checked as boolean)}
                            />
                            <label 
                                htmlFor="notify-members" 
                                className="text-sm font-medium cursor-pointer flex-1"
                            >
                                Notify affected members
                                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                                    Send email notifications about the cancellation
                                </p>
                            </label>
                        </div>
                    </DialogBody>
                )}
                
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        Keep Session
                    </Button>
                    <Button 
                        onClick={handleCancel} 
                        disabled={loading}
                        variant={isHardDelete ? "destructive" : "foreground"}
                    >
                        {loading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isHardDelete ? (
                            'Delete Permanently'
                        ) : (
                            'Cancel Session'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}