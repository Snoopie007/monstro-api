import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator
} from '@/components/ui'
import { ProgramSession } from '@/types'
import { useState } from 'react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog'
import { useForm, FormProvider } from 'react-hook-form'
import { cn } from '@/libs/utils'
import SessionFields from './SessionFields'
import { SessionSchema } from '../../../schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface SessionActionsProps {
    session: ProgramSession
    lid: string
}

export default function SessionActions({ session, lid }: SessionActionsProps) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formLoading, setFormLoading] = useState(false)

    const formMethods = useForm<z.infer<typeof SessionSchema>>({
        resolver: zodResolver(SessionSchema),
        defaultValues: {
            day: 1,
            time: "12:00:00",
            duration: 30,
        },
        mode: "onSubmit",
    })

    function isDisabled() {
        if (!session) return true
        return session.reservations && session.reservations.length > 0
    }

    async function onDelete(lid: string) {
        if (!lid) return

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${session?.programId}/sessions/${session?.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: lid })
            })
        )
        setLoading(false)

        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to delete session')
        } else {
            toast.success('Session deleted successfully')
        }
    }

    async function submitForm(data: z.infer<typeof SessionSchema>) {
        setFormLoading(true)
        try {
            const response = await fetch(`/api/protected/loc/${lid}/programs/${session.programId}/sessions/${session.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) throw new Error('Failed to update session')

            toast.success('Session updated successfully')
            setIsEditDialogOpen(false)
        } catch (error) {
            toast.error((error instanceof Error ? error.message : 'An unknown error occurred') || 'Failed to update session')
        } finally {
            setFormLoading(false)
        }
    }

    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={"ghost"} className='h-auto px-0 hover:bg-transparent'>
                        <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>
                    <DropdownMenuItem
                        className='cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5'
                        onClick={() => setIsEditDialogOpen(true)}
                    >
                        <span>Edit</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className='mb-2' />

                    <DropdownMenuItem
                        className='cursor-pointer bg-red-500'
                        onClick={() => onDelete(session.id)}
                        disabled={isDisabled()}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Delete</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-[500px] max-w-[500px]">
                    <DialogHeader className="px-4 py-3 space-y-0">
                        <DialogTitle className="leading-none">
                            Edit Session
                        </DialogTitle>
                        <DialogDescription className="hidden"></DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <FormProvider {...formMethods}>
                            <form>
                                <SessionFields control={formMethods.control} />
                            </form>
                        </FormProvider>
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant={"outline"} size={"sm"}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            variant={"foreground"}
                            size={"sm"}
                            className={cn("children:hidden flex flex-row", (formLoading && "children:inline-block"))}
                            onClick={formMethods.handleSubmit(submitForm)}
                            disabled={formLoading || !formMethods.formState.isValid}
                        >
                            <Icon name="LoaderCircle" size={14} className="mr-2 animate-spin" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
  );
}