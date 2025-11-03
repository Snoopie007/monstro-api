'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Location } from "@/types";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { Industries } from "@/libs/data";

export default function CompanyLogo({ location }: { location: Location }) {
    const [industry, setIndustry] = useState(location.industry);
    const [loading, setLoading] = useState(false);


    async function update() {
        if (!industry || industry === location.industry) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/config/company`, {
                method: "POST",
                body: JSON.stringify({ industry })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update timezone");
            setIndustry(location.industry);
            return;
        }

    }



    return (
        <div className="bg-foreground/5 rounded-lg">

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Industry</div>
                    <p className="text-sm text-muted-foreground">
                        This is the industry that will be used to display the industry in the location.
                    </p>
                </div>
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
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button variant="foreground" size="sm" disabled={loading} onClick={update}
                >
                    {loading ? <Loader2 className="animate-spin size-4 " /> : 'Update'}
                </Button>

            </div>
        </div>
    )
}
