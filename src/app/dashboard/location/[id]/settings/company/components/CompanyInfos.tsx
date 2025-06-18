'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Input } from "@/components/forms";
import { z } from "zod";
import { InfoType } from "../page";


type CompanyInfoProps = {
    lid: string;
    type: InfoType;
    title?: string;
    description?: string;
    currentValue: string | null;
};

export default function CompanyInfos({ lid, currentValue, type, title, description }: CompanyInfoProps) {
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState<string | null>(currentValue);

    async function update() {
        if (!value || value === currentValue) return;
        setLoading(true);

        const payload = { [type]: value };

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/vendor/company`, {
                method: "POST",
                body: JSON.stringify(payload)
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error(`Failed to update ${type}`);
            return;
        }
        const data = await result.json();
        setValue(data[type]);
    }

    return (
        <Card className="rounded-sm  border-foreground/10">
            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>
                        {description}
                    </CardDescription>
                </CardHeader>
                <Input
                    type="text"
                    className="rounded-sm w-60"
                    placeholder={`Enter ${type}`}
                    value={value ?? undefined}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
            <CardFooter className="flex justify-end border-t px-6 py-3 bg-foreground/5 border-foreground/5">
                <Button
                    variant="foreground"
                    size="sm"
                    disabled={loading || !value || value === currentValue}
                    onClick={update}
                    className={cn('children:hidden', loading && 'children:block')}
                >
                    {loading && <Loader2 className="animate-spin size-4 mr-2" />}
                    Save
                </Button>

            </CardFooter>
        </Card>
    )
}
