'use client'
import React, { useState } from 'react'


import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    RegionSelect,
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
import { CountryCodes } from '@/libs/data';
import { tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { useTaxRate } from '../providers';

interface NewTaxRateProps {
    lid: string;
}

export function NewTaxRate({ lid }: NewTaxRateProps) {
    const { setTaxRates } = useTaxRate();
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof taxRateSchema>>({
        resolver: zodResolver(taxRateSchema),
        defaultValues: {
            name: "",
            country: "US",
            state: "",
            percentage: 0,
        },
    });



    async function onSubmit(data: z.infer<typeof taxRateSchema>) {
        if (form.formState.isSubmitting) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/stripe`, {
                method: "POST",
                body: JSON.stringify(data)
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Failed to create tax rate");
            return;
        }

        const res = await result.json();
        // Update tax rates list if needed
        if (res.taxRate) {
            setTaxRates((prev) => [...prev, res.taxRate]);
        }

        setOpen(false);
        form.reset();
        toast.success("Tax rate created successfully");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"foreground"}>
                    Add Tax Rate
                </Button>
            </DialogTrigger>

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
                            <div className='grid grid-cols-2 gap-2'>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
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
                                    name="percentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>Percentage</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="0.00"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Allow only numbers and one decimal point
                                                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                                            const numValue = value === '' ? 0 : parseFloat(value);
                                                            field.onChange(isNaN(numValue) ? 0 : numValue);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        // Format to 2 decimal places on blur
                                                        const value = parseFloat(e.target.value);
                                                        if (!isNaN(value)) {
                                                            field.onChange(parseFloat(value.toFixed(2)));
                                                        }
                                                    }}
                                                    value={field.value ? field.value.toString() : ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>Country</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {CountryCodes.map((country) => (
                                                        <SelectItem key={country.code} value={country.code}>
                                                            {country.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>State</FormLabel>
                                            <RegionSelect
                                                value={field.value}
                                                onChange={(value) => field.onChange(value)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>


                        </form>
                    </Form>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button size='sm' variant={'outline'}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        size='sm'
                        variant={'foreground'}
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin ' /> : "Add Tax Rate"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
