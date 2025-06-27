'use client'
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui";
import { useState } from "react";
import React from "react";
import { SubForm } from "./SubForm";

export function CreateSubscription({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);


    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} >+ Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] border-foreground/10">
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Add Member Subscription
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <SubForm params={params} setOpen={setOpen} />
            </DialogContent>
        </Dialog >
    )
}

