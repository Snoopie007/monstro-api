'use client'
import { CameraIcon, Loader2 } from "lucide-react";
import React, { useRef, useState } from 'react'
import Image from "next/image";
import { Button, Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Location } from "@/types";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import { toast } from "react-toastify";
import { Input } from "@/components/forms";

export default function CompanyLogo({ location }: { location: Location }) {
    const [name, setName] = useState(location.name);
    const [loading, setLoading] = useState(false);


    async function update() {
        if (!name || name === location.name) return;
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/update`, {
                method: "POST",
                body: JSON.stringify({ name })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to update company name");
            return;
        }
        const data = await result.json();
        setName(data.name);
    }



    return (
        <Card className="rounded-sm bg-foreground/5 border-foreground/10">

            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-lg">Friendly Business Name</CardTitle>
                    <CardDescription>
                        This is the name that will be displayed to the public.
                    </CardDescription>
                </CardHeader>
                <Input type="text" className="rounded-sm w-60" placeholder="Friendly Business Name"
                    value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <CardFooter className="flex justify-end border-t px-6 py-3 border-foreground/10">
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
