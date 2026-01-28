'use client'
import { Loader2 } from "lucide-react";
import { useState } from 'react'
import { Button } from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { toast } from "react-toastify";
import { CountryCodes } from "@/libs/data";
import { CountryCode, Staff, Vendor } from "@/types";
import { PatternFormat } from "react-number-format";
import { getPhoneFormat } from "@/libs/utils";

export default function UserPhone({ user }: { user: Vendor | Staff }) {

    const normalizedPhone = user.phone
        ? user.phone.replace(/^\+?1/, '').replace(/\D/g, '')
        : "";
    const [newPhone, setNewPhone] = useState(normalizedPhone || "");
    const [loading, setLoading] = useState(false);
    // Store country code as string to match CountryCodes values (which uses "UK" not "GB")
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");

    async function update() {
        if (!newPhone || newPhone === normalizedPhone) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/account/settings/${user.id}/phone`, {
                method: "POST",
                body: JSON.stringify({ phone: newPhone })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update phone number");
            setNewPhone(user.phone || "");
            return;
        }
    }



    return (
        <div className="bg-foreground/5 rounded-lg">

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Phone</div>
                    <p className="text-sm text-muted-foreground">
                        Update your phone number to receive notifications and updates.
                    </p>
                </div>
                <div className="flex flex-row gap-1 justify-start w-100">
                    <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>
                        <SelectTrigger className=" w-[22%]">
                            <SelectValue defaultValue={"US"} />
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
                        value={newPhone}
                        onValueChange={(values) => {
                            if (values.value) {
                                setNewPhone(values.value);
                            } else {
                                setNewPhone("");
                            }
                        }}
                        format={getPhoneFormat(phoneRegion)}
                        onChange={(e) => setNewPhone(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button variant="foreground" size="sm" disabled={loading} onClick={update}
                >
                    {loading ? <Loader2 className="animate-spin size-4" /> : "Update"}
                </Button>

            </div>
        </div>
    )
}
