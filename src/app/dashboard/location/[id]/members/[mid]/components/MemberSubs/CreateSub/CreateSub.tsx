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
import { VisuallyHidden } from "react-aria";

export function CreateSubscription({ params }: { params: { id: string, mid: string } }) {
    const [open, setOpen] = useState<boolean>(false);


    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} >+ Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <SubForm params={params} setOpen={setOpen} />
            </DialogContent>
        </Dialog >
    )
}

