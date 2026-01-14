'use client'
import React from 'react'


import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
    Input,
    Textarea,
} from '@/components/forms';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    Button, DialogDescription,
    DialogTitle, DialogHeader, Dialog,
    DialogContent, DialogBody,
    DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui';
import { taxRateSchema } from './schema';
import { tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { useTaxRates } from '../provider';
import { TaxRate } from '@/types/tax';

interface UpdateTaxRateProps {
    lid: string;
    taxRate: TaxRate;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function UpdateTaxRate({ lid, taxRate, open, setOpen }: UpdateTaxRateProps) {

    const { setTaxRates } = useTaxRates();
    const form = useForm<z.infer<typeof taxRateSchema>>({
        resolver: zodResolver(taxRateSchema),
        defaultValues: {
            name: "",
            country: "US",
            state: "",
            percentage: 0,
            inclusive: false,
        },
    });



    async function onSubmit(v: z.infer<typeof taxRateSchema>) {
        if (form.formState.isSubmitting) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/${taxRate.id}`, {
                method: "PATCH",
                body: JSON.stringify(v)
            })
        );

        if (error || !result || !result.ok) {

            toast.error("Failed to create tax rate");
            return;
        }

        const newTaxRate = await result.json();

        // Update tax rates list using function form
        setTaxRates((prev) => [...prev, newTaxRate]);

        setOpen(false);
        form.reset();
        toast.success("Tax rate created successfully");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogContent className="max-w-lg" aria-modal>
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        New Tax Rate
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-4'>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className='col-span-4'>
                                        <FormLabel size='tiny'>Name</FormLabel>
                                        <FormControl>
                                            <Input type="text" placeholder="Example: State Tax" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size='tiny'>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Description" className=" h-12 resize-none" {...field} />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </form>
                    </Form>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={'outline'}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button

                        variant={'foreground'}
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin ' /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
