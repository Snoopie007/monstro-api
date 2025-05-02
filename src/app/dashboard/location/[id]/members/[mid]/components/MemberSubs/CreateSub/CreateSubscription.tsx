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
import { DEFAULT_PROGRESS, SubPackageProgress } from "../../SessionForm";

export function CreateSubscription({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);

    const [progress, setProgress] = useState<SubPackageProgress>(DEFAULT_PROGRESS);

    function handleOpenChange(open: boolean) {
        setOpen(open)
        if (!open) {
            setProgress(DEFAULT_PROGRESS)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} className='border'>+ Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Add Member Subscription
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <SubForm params={params} progress={progress} setProgress={setProgress} />
            </DialogContent>
        </Dialog >
    )
}

