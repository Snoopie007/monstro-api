'use client'

import { FormDescription, Input } from "@/components/forms"

import {
    Button,
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogBody,
    DialogTitle,
    DialogClose,
    DialogFooter,
    Switch,

} from "@/components/ui"
import { cn, sleep, tryCatch } from "@/libs/utils"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "react-toastify"
import {
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea,
} from "@/components/forms"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { NewContractSchema } from "../schema"
import { useForm } from "react-hook-form"
import { Loader2, Plus } from "lucide-react"
import { VisuallyHidden } from "react-aria"

export function CreateContract({ locationId }: { locationId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();


    const form = useForm<z.infer<typeof NewContractSchema>>({
        resolver: zodResolver(NewContractSchema),
        defaultValues: {
            title: "",
            description: "",
            type: "contract",
            requireSignature: false,
        },
    });

    async function handleSubmit(v: z.infer<typeof NewContractSchema>) {
        setLoading(true);
        sleep(3000);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/contracts`, {
                method: "POST",
                body: JSON.stringify(v)
            })
        );

        if (result?.status === 403) {
            toast.error("You are not authorized to create a contract");
            return;
        }

        if (error || !result || !result.ok) {
            return toast.error(error?.message || "Failed to create contract");

        }

        const data = await result.json();
        setLoading(false);

        router.push(`/builder/${locationId}/contract/${data.id}`);
    }


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"primary"} className="items-center gap-2" >
                    <span>Contract</span>
                    <Plus className="size-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>

                </VisuallyHidden>
                <DialogBody>
                    <Form {...form}>
                        <form className="space-y-2">
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Contract Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Contract Title" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Contract Type</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Contract Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["contract", "waiver"].map((type) => (
                                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Program Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Contract Description"
                                                    className="resize-none h-auto border-foreground/10"
                                                    {...field}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="requireSignature"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center rounded-lg gap-3 border border-foreground/10 py-2 px-3 ">

                                            <FormControl className="-mt-1.5">
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm">
                                                    Require Signature
                                                </FormLabel>
                                                <FormDescription className="text-xs">
                                                    If turn  on, the customer will need to sign the contract before they join.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"outline"} size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button variant={"foreground"} size={"sm"} className={cn("children:hidden", { "children:inline-block": loading })}
                            onClick={form.handleSubmit(handleSubmit)}>
                            <Loader2 className="animate-spin mr-1 size-3.5" />
                            Create
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
