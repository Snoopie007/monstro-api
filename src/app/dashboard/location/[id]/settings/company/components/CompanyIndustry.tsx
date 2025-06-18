'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Location } from "@/types";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { Industries, TimeZones } from "@/libs/data";

export default function CompanyLogo({ location }: { location: Location }) {
    const [industry, setIndustry] = useState(location.industry);
    const [loading, setLoading] = useState(false);


    async function update() {
        if (!industry || industry === location.industry) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/vendor/company`, {
                method: "POST",
                body: JSON.stringify({ industry })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update timezone");
            return;
        }
        const data = await result.json();
        setIndustry(data.industry);
    }



    return (
        <Card className="rounded-sm  border-foreground/10">

            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-base">Industry</CardTitle>
                    <CardDescription>
                        This is the industry that will be used to display the industry in the location.
                    </CardDescription>
                </CardHeader>
                <Select onValueChange={setIndustry} value={industry ?? undefined} >

                    <SelectTrigger className="rounded-sm w-60">
                        <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>

                    <SelectContent>
                        {Industries.map((industry, index) => (
                            <SelectItem key={index} value={industry} >
                                {industry}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <CardFooter className="flex justify-end border-t px-6 py-3 bg-foreground/5 border-foreground/5">
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
