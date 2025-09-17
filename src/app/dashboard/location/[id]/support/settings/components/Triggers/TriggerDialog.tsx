'use client'
import {
    Dialog, DialogTitle, DialogHeader,
    DialogContent, DialogTrigger, Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    Switch,
    DialogDescription,
} from "@/components/ui";

import { SupportAssistant } from "@/types";
import { useFieldArray, useForm, UseFormReturn } from 'react-hook-form';
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
import { Loader2, Trash2 } from "lucide-react";
import { cn, tryCatch, sleep } from "@/libs/utils";
import { toast } from "react-toastify";
import { useState } from "react";
import { useBotSettingContext } from "../../provider";
import { TriggerSchema } from "@/libs/FormSchemas/SupportBotSchema";

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
                <DialogHeader className="space-y-0">
                    <DialogTitle>Create a Trigger</DialogTitle>
                    <DialogDescription className="hidden"></DialogDescription>
                </DialogHeader>
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
        </Dialog>
    );
}

// function ExampleField({ form }: { form: UseFormReturn<z.infer<typeof TriggerSchema>> }) {
//     const { fields, remove, append } = useFieldArray({
//         control: form.control,
//         name: "examples",
//     });

//     return (
//         <fieldset className="space-y-1">
//             <FormLabel size="sm">Examples</FormLabel>
//             <div className=" border bg-foreground/5 border-foreground/10 rounded-md p-2 space-y-1">
//                 <div className="space-y-1">
//                     {fields.map((field, index) => (
//                         <FormField
//                             key={field.id}
//                             control={form.control}
//                             name={`examples.${index}.value`}
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <div className="flex gap-1 items-center">
//                                         <FormControl>
//                                             <Input {...field} className={InputStyle} />
//                                         </FormControl>
//                                         <Button type="button" variant="ghost" size="icon"
//                                             className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
//                                             onClick={() => remove(index)}>
//                                             <Trash2 className="size-3.5" />
//                                         </Button>
//                                     </div>
//                                 </FormItem>
//                             )}
//                         />
//                     ))}
//                 </div>
//                 <Button type="button" variant="foreground" size="xs"
//                     className="rounded-sm "
//                     onClick={() => append({ value: '' })}
//                     disabled={fields.length >= 4}>
//                     + Example
//                 </Button>
//             </div>

//         </fieldset>
//     )
// }

// function RequirementField({ form }: { form: UseFormReturn<z.infer<typeof TriggerSchema>> }) {
//     const { fields, remove, append } = useFieldArray({
//         control: form.control,
//         name: "requirements",
//     });

//     return (
//         <fieldset className="space-y-2">
//             <FormLabel size="sm">Requirements</FormLabel>
//             <div className="space-y-1 border bg-foreground/5 border-foreground/10 rounded-md p-2 ">
//                 <div className="space-y-1">
//                     {fields.map((field, index) => (
//                         <FormField
//                             key={field.id}
//                             control={form.control}
//                             name={`requirements.${index}.value`}
//                             render={({ field }) => (
//                                 <FormItem>

//                                     <div className="flex gap-1 items-center">
//                                         <FormControl>
//                                             <Input {...field} className={InputStyle} />
//                                         </FormControl>
//                                         <Button type="button" variant="ghost" size="icon"
//                                             className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
//                                             onClick={() => remove(index)}>
//                                             <Trash2 className="size-3.5" />
//                                         </Button>
//                                     </div>
//                                 </FormItem>
//                             )}
//                         />
//                     ))}
//                 </div>
//                 <Button type="button" variant="foreground" size="xs"
//                     className="rounded-sm "
//                     onClick={() => append({ value: '' })}
//                     disabled={fields.length >= 4}>
//                     + Requirement
//                 </Button>
//             </div>
//         </fieldset>
//     )
// }
