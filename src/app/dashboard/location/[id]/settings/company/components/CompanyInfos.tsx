'use client'
import { Loader2 } from "lucide-react";
import React, { useState } from 'react'
import { Button } from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Input } from "@/components/forms";
import { InfoType } from "../page";
import { LocationStatus } from "@/types";
import { useSession } from "@/hooks/useSession";


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
    const { data: session, update } = useSession()
    async function saveChanges() {
        if (!value || value === currentValue) return;
        setLoading(true);

        const payload = { [type]: value };

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/company`, {
                method: "POST",
                body: JSON.stringify(payload)
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error(`Failed to update ${type}`);
            setValue(currentValue);
            return;
        }
        if (type === 'name') {
            // update the session
            await update();
            toast.success(`Location name updated!`);
        }
    }

    return (
        <div className="bg-foreground/5 rounded-lg">
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">{title}</div>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                <Input
                    type="text"
                    className=" w-60"
                    placeholder={`Enter ${type}`}
                    value={value ?? ''}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button
                    variant="foreground"
                    size="sm"
                    disabled={loading || !value || value === currentValue}
                    onClick={saveChanges}
                >
                    {loading ? <Loader2 className="animate-spin size-4 " /> : 'Update'}
                </Button>
            </div>
        </div>
    );
}
