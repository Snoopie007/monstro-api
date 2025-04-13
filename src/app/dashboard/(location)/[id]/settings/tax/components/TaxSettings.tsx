import React, { useState } from 'react'

import { useTaxSettings } from '@/hooks/useTaxSettings';

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
import { Button } from '@/components/ui';
import { TaxCodes } from './schema';
import { CountryCodes } from '@/libs/data';
import { Location } from '@/types';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';



export function TaxSettings({ lid, location }: { lid: string, location: Location }) {
    const { mutate } = useTaxSettings(lid);
    const [loading, setLoading] = useState(false);


    const form = useForm<z.infer<typeof TaxSettingsSchema>>({
        resolver: zodResolver(TaxSettingsSchema),
        defaultValues: {
            office: {
                country: "US",
                state: location.state || "",
                city: location.city || "",
                line1: location.address || "",
                postal_code: location.postalCode || "",
            },
            tax_behavior: 'exclusive',
            tax_code: 'txcd_99999999',
        },
    });



    async function onSubmit(data: z.infer<typeof TaxSettingsSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/tax/settings`, {
                method: "POST",
                body: JSON.stringify(data),
            })
        )

        setLoading(false);

        if (error || !result || !result.ok) {
            toast.error("Failed to update tax settings");
            return;
        }

        await mutate();

        return toast.success("Tax settings updated");
    }

    return (
        <div className='border border-foreground/10 rounded-sm  space-y-2'>

            <Form {...form}>
                <form className='space-y-1 p-4'>
                    <p className='text-sm '>
                        If looks like you've not registered your tax settings with Stripe yet,
                        to be able to collect tax on your sales, please register your tax settings below.
                    </p>
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
                        <div className="flex flex-row gap-4">
                            <FormField
                                control={form.control}
                                name="office.line1"
                                render={({ field }) => (
                                    <FormItem className="flex-1">

                                        <FormControl>
                                            <Input type="text" className="rounded-sm" placeholder="Street Address" {...field} />
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
                                            <Input type="text" className="rounded-sm" placeholder="City" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                    <fieldset>
                        <div className="grid grid-cols-9 gap-4">
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
                                            <Input type="text" className="rounded-sm" placeholder="Postal Code" {...field} />
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
                                                <SelectTrigger className="rounded-sm">
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
            <div className='border-t border-foreground/5 px-4 py-2  bg-foreground/5 flex justify-end'>
                <Button size='sm' variant={'foreground'} onClick={form.handleSubmit(onSubmit)}
                    className={cn("children:hidden", loading && "children:flex")}
                    disabled={loading || !form.formState.isValid}>
                    <Loader2 className='size-4 animate-spin mr-2' />
                    Save
                </Button>
            </div>
        </div>
    )
}
