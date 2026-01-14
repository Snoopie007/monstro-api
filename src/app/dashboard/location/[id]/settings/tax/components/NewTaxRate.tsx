'use client'
import { useState } from 'react'
import { NumericFormat } from 'react-number-format';

import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    RegionSelect,
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
import { CountryCodes } from '@/libs/data';
import { tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2, PlusIcon } from 'lucide-react';
import { useTaxRates } from '../provider';
interface NewTaxRateProps {
    lid: string;
}

export function NewTaxRate({ lid }: NewTaxRateProps) {
    const [open, setOpen] = useState(false);
    const { taxRates, setTaxRates } = useTaxRates();
    const form = useForm<z.infer<typeof taxRateSchema>>({
        resolver: zodResolver(taxRateSchema),
        defaultValues: {
            name: "",
            country: "US",
            state: "",
            percentage: 0,
            description: "",
            inclusive: false,
        },
    });



    async function onSubmit(v: z.infer<typeof taxRateSchema>) {
        if (form.formState.isSubmitting) return;

        console.log(v);
        const isDefault = taxRates.length === 0;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    isDefault
                })
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
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"foreground"} className="flex flex-row items-center gap-1">
                    <span>Tax Rate</span>
                    <PlusIcon className='size-4' />
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
                            <div className='grid grid-cols-6 gap-2'>
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
                                    name="percentage"
                                    render={({ field }) => (
                                        <FormItem className='col-span-2'>
                                            <FormLabel size='tiny'>Percentage</FormLabel>
                                            <FormControl>
                                                <NumericFormat
                                                    customInput={Input}
                                                    value={field.value}

                                                    decimalScale={2}
                                                    fixedDecimalScale={true}

                                                    allowNegative={false}

                                                    onValueChange={(values) => {
                                                        if (values.floatValue) {
                                                            console.log(values.floatValue);
                                                            field.onChange(values.floatValue);
                                                        } else {
                                                            field.onChange(0);
                                                        }
                                                    }} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">

                                <FormField control={form.control} name="inclusive" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size='tiny'>Inclusive</FormLabel>
                                        <Select 
                                            onValueChange={(value) => field.onChange(value === "true")} 
                                            defaultValue={field.value.toString()}
                                            value={field.value.toString()}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select inclusive" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Yes</SelectItem>
                                                <SelectItem value="false">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
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
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>Country</FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select country" />
                                                </SelectTrigger>
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
                            </div>
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
                    // disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin ' /> : "Add Tax Rate"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
