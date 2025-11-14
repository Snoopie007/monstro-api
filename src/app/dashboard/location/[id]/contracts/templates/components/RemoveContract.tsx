"use client";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui"
import { useState } from "react"
import { toast } from "react-toastify"
import { tryCatch } from "@/libs/utils"
import { Loader2 } from "lucide-react"

interface RemoveContractProps {
    cid: string
    editable: boolean
    lid: string
    open: boolean
    onOpenChange: (open: boolean) => void
}


export default function RemoveContract({ cid, editable, lid, open, onOpenChange }: RemoveContractProps) {
    const [loading, setLoading] = useState(false)



    async function onDelete(id: string) {
        if (!id) return
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/contracts/${id}`, {
                method: 'DELETE',
            })
        )
        setLoading(false)
        if (result?.status === 403) {
            toast.error('You are not authorized to delete this contract')
            return
        }

        if (error && !result) {
            toast.error(error.message)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>

            <AlertDialogContent className="border-foreground/10">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete this contract?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(cid)} disabled={loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>

        </AlertDialog>

    )
}


