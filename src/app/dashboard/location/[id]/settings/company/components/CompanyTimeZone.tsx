'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Location } from "@subtrees/types";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { TimeZones } from "@/libs/data";

export default function CompanyLogo({ location }: { location: Location }) {
    const [timezone, setTimezone] = useState(location.timezone);
    const [loading, setLoading] = useState(false);


    async function update() {
        if (!timezone || timezone === location.timezone) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/config/company`, {
                method: "POST",
                body: JSON.stringify({ timezone })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update timezone");
            setTimezone(location.timezone);
            return;
        }
        setTimezone(timezone);
    }



    return (
        <div className="bg-foreground/5 rounded-lg">

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Timezone</div>
                    <p className="text-sm text-muted-foreground">
                        This is the timezone that will be used to display the time in the location.
                    </p>
                </div>
                <Select onValueChange={setTimezone} value={timezone ?? undefined} >

                    <SelectTrigger className="rounded-sm w-60 text-left">
                        <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>

                    <SelectContent>
                        {TimeZones.map((timezone, index) => (
                            <SelectItem key={index} value={timezone.split(" ")[1]}>
                                {timezone}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
