'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button } from "@/components/ui";
import { Location } from "@subtrees/types";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Form,
    FormField,
    FormItem,
    FormControl,
    FormMessage,
    Input,
    RegionSelect
} from "@/components/forms";
import { toast } from "react-toastify";
import { CompanyAddressSchema } from "./schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CountryCodes } from "@/libs/data";

export default function CompanyAddress({ location }: { location: Location }) {

    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof CompanyAddressSchema>>({
        resolver: zodResolver(CompanyAddressSchema),
        defaultValues: {
            address: location.address || "",
            city: location.city || "",
            state: location.state || "",
            postalCode: location.postalCode || "",
            country: location.country || "",
        },
        mode: "onSubmit",
    });
    async function update(values: z.infer<typeof CompanyAddressSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/config/company`, {
                method: "POST",
                body: JSON.stringify(values)
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update address");
            form.reset({
                address: location.address || "",
                city: location.city || "",
                state: location.state || "",
                postalCode: location.postalCode || "",
                country: location.country || "",
            });
            return;
        }
    }
    return (
        <div className="bg-foreground/5 rounded-lg">

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Business Address</div>
                    <p className="text-sm text-muted-foreground">
                        This is the address that will be displayed to the public.
                    </p>
                </div>
                <Form {...form}>
                    <form className="space-y-3">
                        <fieldset>
                            <div className="flex flex-row gap-4">
                                <FormField
                                    control={form.control}
                                    name="address"
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
                                    name="city"
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
                                    name="state"
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
                                    name="postalCode"
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
                                    name="country"
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
            </div>
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button variant="foreground" size="sm" disabled={loading} onClick={form.handleSubmit(update)}
                >
                    {loading ? <Loader2 className="animate-spin size-4 " /> : 'Update'}
                </Button>

            </div>
        </div>
    )
}
