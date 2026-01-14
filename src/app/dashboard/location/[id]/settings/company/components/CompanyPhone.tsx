'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { CountryCode, Location } from "@/types";
import { cn, tryCatch } from "@/libs/utils";
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
            fetch(`/api/protected/loc/${location.id}/config/company`, {
                method: "POST",
                body: JSON.stringify({ phone })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update phone number");
            setPhone(location.phone);
            return;
        }
    }



    return (
        <div className="bg-foreground/5 rounded-lg">

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Business Phone</div>
                    <p className="text-sm text-muted-foreground">
                        This is the phone number that will be displayed to the public.
                    </p>
                </div>
                <div className="flex flex-row gap-1 justify-start w-100">
                    <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>
                        <SelectTrigger className=" w-[22%]">
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
                        className="flex-1 rounded-lg bg-background  border h-12 border-foreground/10 px-4"
                        value={phone ?? undefined}
                        withCountryCallingCode={true}
                        international={true}
                        country={phoneRegion}
                        onChange={(value) => setPhone(value ?? null)}
                    />
                </div>
            </div>
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button variant="foreground" size="sm" disabled={loading} onClick={update}
                >
                    {loading ? <Loader2 className="animate-spin size-4 " /> : 'Update'}
                </Button>

            </div>
        </div>
    )
}
