'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { CountryCode, Location } from "@/types";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { toast } from "react-toastify";
import PhoneInput from 'react-phone-number-input/input'
import { CountryCodes } from "@/libs/data";

export default function CompanyPhone({ location }: { location: Location }) {
    const [phone, setPhone] = useState(location.phone);
    const [loading, setLoading] = useState(false);
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");

    async function update() {
        if (!phone || phone === location.phone) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/vendor/company`, {
                method: "POST",
                body: JSON.stringify({ phone })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update company name");
            return;
        }
        const data = await result.json();
        setPhone(data.phone);
    }



    return (
        <Card className="rounded-sm  border-foreground/10">

            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-base">Business Phone</CardTitle>
                    <CardDescription>
                        This is the phone number that will be displayed to the public.
                    </CardDescription>
                </CardHeader>
                <div className="flex flex-row gap-1 justify-start w-100">
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

                    <PhoneInput
                        type="tel"
                        className="flex-1 rounded-sm bg-background inline-block w-full border py-1.5 px-4"
                        value={phone ?? undefined}
                        withCountryCallingCode={true}
                        international={true}
                        country={phoneRegion}
                        onChange={(value) => setPhone(value ?? null)}
                    />
                </div>
            </div>
            <CardFooter className="flex justify-end border-t px-6 py-3 bg-foreground/5 border-foreground/10">
                <Button variant="foreground" size="sm" disabled={loading} onClick={update}
                    className={cn('children:hidden', loading && 'children:block')}
                >
                    {loading && <Loader2 className="animate-spin size-4 mr-2" />}
                    Save
                </Button>

            </CardFooter>
        </Card>
    )
}
