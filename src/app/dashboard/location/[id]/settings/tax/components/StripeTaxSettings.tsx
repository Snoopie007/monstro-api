'use client'
import React, { Dispatch, SetStateAction, useState } from 'react'


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
import { zodResolver } from '@hookform/resolvers/zod';
import { TaxBehaviors, TaxSettingsSchema } from './schema';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    Button, DialogDescription,
    DialogTitle, DialogHeader, Dialog,
    DialogContent, DialogBody,
    DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui';
import { TaxCodes } from './schema';
import { CountryCodes } from '@/libs/data';
import { Location } from '@/types';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import Stripe from 'stripe';

interface StripeTaxSettingsProps {
    lid: string;
    location: Location;
    settings: Stripe.Tax.Settings | null
    updateSettings: Dispatch<SetStateAction<Stripe.Tax.Settings | null>>
}


export function StripeTaxSettings({ lid, location, settings, updateSettings }: StripeTaxSettingsProps) {

    const [open, setOpen] = useState(false);

    const { head_office, defaults } = settings || {};
    const form = useForm<z.infer<typeof TaxSettingsSchema>>({
        resolver: zodResolver(TaxSettingsSchema),
        defaultValues: {
            office: {
                country: "US",
                state: head_office?.address?.state || location.state || "",
                city: head_office?.address?.city || location.city || "",
                line1: head_office?.address?.line1 || location.address || "",
                postal_code: head_office?.address?.postal_code || location.postalCode || "",
            },
            tax_behavior: defaults?.tax_behavior || 'exclusive',
            tax_code: defaults?.tax_code || 'txcd_99999999',
        },
    });



    async function onSubmit(data: z.infer<typeof TaxSettingsSchema>) {
        if (form.formState.isSubmitting) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/stripe`, {
                method: "POST",
                body: JSON.stringify(data)
            })
        )


        if (error || !result || !result.ok) {
            toast.error("Failed to update tax settings");
            return;
        }
        const res = await result.json();
        updateSettings(res);
        return toast.success("Tax settings updated");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"foreground"} >
                    Enable
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

                            <fieldset className='grid grid-cols-2 gap-2'>
                                <FormField
                                    control={form.control}
                                    name="tax_behavior"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>Tax Behavior</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger >
                                                        <SelectValue placeholder="Select behavior" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {TaxBehaviors.map((behavior) => (
                                                        <SelectItem key={behavior.code} value={behavior.code}>
                                                            {behavior.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tax_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size='tiny'>Tax Code</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger >
                                                        <SelectValue placeholder="Select tax code" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {TaxCodes.map((type) => (
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
                                <FormLabel size='tiny'>Head Office Address</FormLabel>
                                <div className="flex flex-row gap-2">
                                    <FormField
                                        control={form.control}
                                        name="office.line1"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">

                                                <FormControl>
                                                    <Input type="text" placeholder="Street Address" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="office.city"
                                        render={({ field }) => (
                                            <FormItem>

                                                <FormControl>
                                                    <Input type="text" placeholder="City" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </fieldset>

                            <fieldset>
                                <div className="grid grid-cols-9 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="office.state"
                                        render={({ field }) => (
                                            <FormItem className="col-span-3">

                                                <RegionSelect value={field.value}
                                                    onChange={(value) => field.onChange(value)}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="office.postal_code"
                                        render={({ field }) => (
                                            <FormItem className="col-span-3">

                                                <FormControl>
                                                    <Input type="text" placeholder="Postal Code" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="office.country"
                                        render={({ field }) => (
                                            <FormItem className="col-span-3">


                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select your country" />
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
                                </div>
                            </fieldset>
                        </form>
                    </Form>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button size='sm' variant={'outline'}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button size='sm' variant={'foreground'} onClick={form.handleSubmit(onSubmit)}
                        disabled={form.formState.isSubmitting || !form.formState.isValid}>
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin mr-2' /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
