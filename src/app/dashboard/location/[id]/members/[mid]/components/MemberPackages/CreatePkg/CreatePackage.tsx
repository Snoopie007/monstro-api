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

import { PkgForm } from "./PkgForm";
import { DEFAULT_PROGRESS, SubPackageProgress } from "../../SessionForm";

export function CreatePackage({ params }: { params: { id: string, mid: number } }) {
    const [progress, setProgress] = useState<SubPackageProgress>(DEFAULT_PROGRESS);

    const [open, setOpen] = useState<boolean>(false);

    function handleOpenChange(open: boolean) {
        setOpen(open)
        if (!open) {
            setProgress(DEFAULT_PROGRESS)
        }
    }


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} className=''>+ Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Create Package</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <PkgForm params={params} progress={progress} setProgress={setProgress} />
            </DialogContent>
        </Dialog >
    )
}

