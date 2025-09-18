'use client'
import {
    Dialog, DialogTitle, DialogHeader,
    DialogContent, DialogTrigger, Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from "@/components/ui";

import { SupportAssistant } from "@/types";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormField, FormItem, FormLabel,
    FormControl, Input,
    FormDescription,
    Select,
    SelectTrigger,
    SelectValue,
    SelectItem,
    SelectContent
} from "@/components/forms";
import { Loader2 } from "lucide-react";
import { cn, tryCatch, sleep } from "@/libs/utils";
import { toast } from "react-toastify";
import { useState } from "react";
import { TriggerSchema } from "@/libs/FormSchemas";
import { VisuallyHidden } from "react-aria";

interface TriggerDialogProps {
    assistant: SupportAssistant
}

const InputStyle = 'rounded-md h-9 border border-foreground/10 '

export function TriggerDialog({ assistant, }: TriggerDialogProps) {

    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: {
            name: '',
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof TriggerSchema>) {

        if (!assistant) return
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/bots/${assistant.id}/triggers`, {
                method: "POST",
                body: JSON.stringify({
                    // ...v,
                    // requirements: v.requirements.map((r) => r.value),
                    // examples: v.examples.map((e) => e.value),
                }),
            })
        )
        await sleep(1000)
        setLoading(false)
        if (error || !result || !result.ok) {
            return toast.error("Something went wrong")
        }
        toast.success("Fork created")
        const data = await result?.json()
        //update assistant
        setOpen(false)
    }

    const handleOpenChange = (open: boolean) => {
        setOpen(open)
        form.reset()
    }
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={'foreground'} size={'xs'} className="rounded-sm">
                    + Trigger
                </Button>
            </DialogTrigger>
            <DialogContent className="border-foreground/5 sm:rounded-lg">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </VisuallyHidden>
                <DialogBody className=" p-4">
                    <Form {...form}>
                        <form className="space-y-1">

                            <fieldset className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="sm">Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} className={InputStyle} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />


                            </fieldset>


                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={'outline'} size={'sm'}>Cancel</Button>
                    </DialogClose>
                    <Button variant={'foreground'} size={'sm'}
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
