'use client'
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui';

import React, { useEffect, useState } from 'react'

import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel, FormDescription,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    RegionSelect,
} from '@/components/forms';
import { cn, tryCatch } from "@/libs/utils";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaxRegistraionSchema, USTaxTypes } from './schema';
import { DialogClose } from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { Location } from '@/types';



export function RegisterTax({ lid, location }: { lid: string, location: Location }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { data, isLoading, error, mutate } = useTaxSettings(lid);

    const form = useForm<z.infer<typeof TaxRegistraionSchema>>({
        resolver: zodResolver(TaxRegistraionSchema),
        defaultValues: {
            state: "",
            type: "",
        },
    });

    useEffect(() => {
        if (location) {
            form.reset({
                state: location.state || ""
            });
        }
    }, [location]);


    async function onSubmit(data: z.infer<typeof TaxRegistraionSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/tax/registrations`, {
                method: "POST",
                body: JSON.stringify({
                    type: data.type,
                    state: data.state
                }),
            })
        );
        setLoading(false);
        if (error || !result || !result.ok) {
            return toast.error("Failed to register tax");
        }
        setOpen(false);
        mutate();
        toast.success("Tax registered successfully");
    }

    if (!data || data.settings.status !== "active") {
        return (<></>)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"foreground"} >
                    + Region
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg" aria-modal>
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Register Tax Account
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-1'>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Tax Registration Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger >
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {USTaxTypes.map((type) => (
                                                        <SelectItem key={type.code} value={type.code}>
                                                            {type.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">State</FormLabel>
                                            <RegionSelect value={field.value}
                                                onChange={(value) => field.onChange(value)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        </form>
                    </Form>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"outline"} size={"sm"}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" variant={"default"} size={"sm"}
                        disabled={loading || !form.formState.isValid}
                        onClick={form.handleSubmit(onSubmit)}
                        className={cn("children:hidden",)}
                    >
                        <Loader2 />
                        Register
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
