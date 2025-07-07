"use client";
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    Switch,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import {
    Form,
    FormField,
    FormLabel,
    FormMessage,
    FormItem,
    FormControl,
    Input,
    Textarea,
    FormDescription,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";


import { toast } from "react-toastify";
import { Loader2, Pencil } from "lucide-react";
import AddPrograms from "../AddPrograms";
import { useSubscriptions } from "@/hooks/usePlans";
import { UpdateSubPlanSchema } from "@/libs/FormSchemas";
import { MemberPlan } from "@/types";
import { VisuallyHidden } from "react-aria";

interface CreatePlanProps {
    lid: string;
    sub: MemberPlan;
}

export function UpdateSub({ lid, sub }: CreatePlanProps) {
    const [open, setOpen] = useState(false);
    const { mutate: mutateSubs } = useSubscriptions(lid);

    const form = useForm<z.infer<typeof UpdateSubPlanSchema>>({
        resolver: zodResolver(UpdateSubPlanSchema),
        defaultValues: {
            name: sub.name,
            description: sub.description,
            programs: sub.planPrograms?.map((program) => program.program?.id) || [],
            allowProration: sub.allowProration,
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof UpdateSubPlanSchema>) {
        if (form.formState.isSubmitting) return;

        try {

            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/plans/subs/${sub.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        ...v
                    }),
                })
            );

            if (error || !result || !result.ok) {
                toast.error(error?.message || "Something went wrong");
                return;
            }

            toast.success(
                `Subscription updated successfully`
            );
            form.reset();
            await mutateSubs();
            setOpen(false);
        } catch (error) {
            console.error("Error creating plan:", error);
            toast.error("Failed to create plan");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size={"icon"}
                    variant={"ghost"}
                    className=" rounded-md bg-foreground/10 hover:bg-foreground/10 size-5 p-0"
                >
                    <Pencil className="size-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-foreground/10">
                <VisuallyHidden className="space-y-0">
                    <DialogTitle>
                    </DialogTitle>
                </VisuallyHidden>
                <DialogBody>
                    <Form {...form}>
                        <form className="space-y-2">
                            <fieldset className="grid grid-cols-1 gap-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    className={cn("")}
                                                    placeholder="Name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
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
                                            <FormLabel size={"tiny"}>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    className={"resize-none h-8 border-foreground/10"}
                                                    placeholder="Short description"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="programs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Select Programs</FormLabel>
                                            <FormDescription className="text-xs">
                                                Select at least one program that this plan will include.
                                            </FormDescription>
                                            <FormControl>
                                                <AddPrograms
                                                    value={field.value || []}
                                                    onChange={(selectedPrograms) => {
                                                        field.onChange(selectedPrograms);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="allowProration"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm">Allow proration</FormLabel>
                                                <FormDescription className="text-xs">
                                                    Proration will allow you to charge the customer.
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
                    <div className="flex flex-row gap-2 items-center">
                        <DialogClose asChild>
                            <Button
                                size={"sm"}
                                variant={"outline"}
                                className="bg-transparent"
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            size={"sm"}
                            onClick={form.handleSubmit(onSubmit)}
                            variant={"foreground"}
                            disabled={form.formState.isSubmitting || !form.formState.isValid}
                        >
                            {form.formState.isSubmitting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                "Update"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
