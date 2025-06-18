'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Location } from "@/types";
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
            fetch(`/api/protected/loc/${location.id}/vendor/company`, {
                method: "POST",
                body: JSON.stringify({ timezone })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update timezone");
            return;
        }
        const data = await result.json();
        setTimezone(data.timezone);
    }



    return (
        <Card className="rounded-sm  border-foreground/10">

            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-base">Timezone</CardTitle>
                    <CardDescription>
                        This is the timezone that will be used to display the time in the location.
                    </CardDescription>
                </CardHeader>
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
