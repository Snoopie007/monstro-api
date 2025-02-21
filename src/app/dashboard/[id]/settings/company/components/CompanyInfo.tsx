'use client'
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CountryCode } from "@/types";
import { toast } from "react-toastify";
import { cn, tryCatch } from "@/libs/utils";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/forms";

import { Loader2 } from "lucide-react";
import PhoneInput from 'react-phone-number-input/input'

import { Card, CardContent, CardFooter, CardHeader, CardTitle, Button } from "@/components/ui";

import CompanyLogo from "./CompanyLogo";
import { RegionSelect } from "@/components/forms";
import { CompanyInfoSchema } from "./schemas";
import { Industries, CountryCodes, TimeZones } from "@/libs/data";
import { Location } from "@/types";
interface CompanyProps {
    location: Location;
}

export default function CompanyInfoForm({ location }: CompanyProps) {

    const [logoUrl, setLogoUrl] = useState(location.logoUrl || "");
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof CompanyInfoSchema>>({
        resolver: zodResolver(CompanyInfoSchema),
        defaultValues: {
            name: location.name || "",
            // legalName: location.legalName || "",
            email: location.email || "",
            phone: location.phone || "",
            logoUrl: location.logoUrl || "",
            industry: location.industry || "",
            website: location.website || "",
            address: location.address || "",
            city: location.city || "",
            state: location.state || "",
            postalCode: location.postalCode || "",
            country: location.country || "",
            timezone: location.timezone || ""
        },
        mode: "onSubmit",
    });

    useEffect(() => {
        if (location) {
            setPhoneRegion(location.country as CountryCode);
        }
    }, [location]);

    async function onSubmit(values: z.infer<typeof CompanyInfoSchema>) {
        setLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/${location.id}/company`, {
                method: 'POST',
                body: JSON.stringify(values),
            })
        )

        if (error || !result || !result.ok) {
            toast.error("Something went wrong", {
                hideProgressBar: true,
                closeOnClick: true,
            });
        }


        setLoading(false);
        toast.success("Info Updated Successfully");

    }

    return (
        <Card className='rounded-sm'>
            <CardContent className="p-0">
                <CardHeader className="border-b py-2 px-4">
                    <CardTitle className="text-lg">General Information</CardTitle>
                </CardHeader>
                <div className="px-4 py-6">
                    <CompanyLogo logo={logoUrl} setLogoUrl={setLogoUrl} locationId={location.id} />
                    <Form {...form}>
                        <form className="space-y-3">
                            <input type="hidden" name="logo" value={logoUrl} />

                            <fieldset>
                                <div className="flex gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem className="flex-1 mt-0">
                                                <FormLabel size="tiny">
                                                    Friendly Business Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="text" className="rounded-sm" placeholder="Friendly Business Name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem className="flex-1 mt-0">
                                                <FormLabel size="tiny">
                                                    Legal Business Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="text" className="rounded-sm" placeholder="Legal Business Name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </fieldset>

                            <fieldset>
                                <div className="flex flex-row gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">
                                                    Business Email
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="email" className="rounded-sm" placeholder="Email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex-1 justify-center space-y-2">
                                        <FormLabel size="tiny">
                                            Business Phone
                                        </FormLabel>
                                        <div className="flex flex-row gap-1">
                                            <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>
                                                <SelectTrigger className="rounded-sm w-[22%] h-auto">
                                                    <SelectValue defaultValue={location.country || "US"} />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {CountryCodes.map((country) => (
                                                        <SelectItem key={country.code} value={country.code}>
                                                            {country.shortName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field: { onChange, value } }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <PhoneInput
                                                                type="tel"
                                                                className="rounded-sm bg-transparent inline-block w-full border py-1.5 px-4"
                                                                value={value}
                                                                withCountryCallingCode={true}
                                                                international={true}
                                                                country={phoneRegion}
                                                                onChange={onChange}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset>
                                <div className="flex flex-row gap-4">
                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">
                                                    Website
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="text" className="rounded-sm" placeholder="Website" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="industry"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">
                                                    Industry
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="rounded-sm">
                                                            <SelectValue placeholder="Select your industry" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Industries.map((industry, index) => (
                                                            <SelectItem key={index} value={industry} >
                                                                {industry}
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

                            <fieldset>
                                <div className="flex flex-row gap-4">
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">
                                                    Street Address
                                                </FormLabel>
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
                                                <FormLabel size="tiny">
                                                    City
                                                </FormLabel>
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
                                                <FormLabel size="tiny">
                                                    State / Prov / Region
                                                </FormLabel>
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
                                                <FormLabel size="tiny">
                                                    Postal Code
                                                </FormLabel>
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
                                                <FormLabel size="tiny">
                                                    Country
                                                </FormLabel>
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

                            <fieldset>
                                <div className="flex flex-row gap-4">
                                    <FormField
                                        control={form.control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">
                                                    Timezone
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} required>
                                                    <FormControl>
                                                        <SelectTrigger className="rounded-sm">
                                                            <SelectValue placeholder="Select your timezone" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {TimeZones.map((timezone, index) => (
                                                            <SelectItem key={index} value={timezone.split(" ")[1]}>
                                                                {timezone}
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

                <CardFooter className="px-4 py-3 border-t justify-end">
                    <Button
                        variant="foreground"
                        size="sm"
                        className={cn("children:hidden", {
                            "children:inline-block": loading
                        })}
                        type="submit"
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Update
                    </Button>
                </CardFooter>
            </CardContent>
        </Card>
    );
}
