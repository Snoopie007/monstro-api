'use client'
import { Loader2 } from "lucide-react";
import { useState } from 'react'
import { Button } from "@/components/ui";
import { Location } from "@subtrees/types";
import { tryCatch } from "@/libs/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { toast } from "react-toastify";
import { CountryCodes } from "@/libs/data";
import { PatternFormat } from "react-number-format";
import { getPhoneFormat } from "@/libs/utils";

export default function CompanyPhone({ location }: { location: Location }) {
    const normalizedPhone = location.phone
        ? location.phone.replace(/^\+?1/, '').replace(/\D/g, '')
        : "";
    const [phone, setPhone] = useState(normalizedPhone);
    const [loading, setLoading] = useState(false);
    // Store the actual country code from CountryCodes (which uses "UK" not "GB")
    // Map it for the format function which handles both
    const getInitialCountryCode = (): string => {
        const country = location.country;
        if (!country) return "US";
        // If location has "GB", map it to "UK" to match CountryCodes
        if (country === "GB") return "UK";
        // Check if it's one of the valid codes from CountryCodes
        const validCodes = CountryCodes.map(c => c.code);
        return validCodes.includes(country) ? country : "US";
    };
    const [phoneRegion, setPhoneRegion] = useState<string>(getInitialCountryCode());

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
            setPhone(normalizedPhone);
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
                    <Select onValueChange={(value: string) => {
                        setPhoneRegion(value);
                        // Reset phone when country changes to allow new format
                        setPhone("");
                    }} defaultValue={phoneRegion} value={phoneRegion}>
                        <SelectTrigger className=" w-[22%]">
                            <SelectValue defaultValue={getInitialCountryCode()} />
                        </SelectTrigger>

                        <SelectContent>
                            {CountryCodes.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.shortName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <PatternFormat
                        type="tel"
                        className="flex-1 rounded-lg bg-background  border h-12 border-foreground/10 px-4"
                        value={phone}
                        onValueChange={(values) => {
                            if (values.value) {
                                setPhone(values.value);
                            } else {
                                setPhone("");
                            }
                        }}
                        format={getPhoneFormat(phoneRegion === "UK" ? "GB" : phoneRegion)}
                        onChange={(e) => setPhone(e.target.value)}
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
