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

export function CreatePackage({ params }: { params: { id: string, mid: string } }) {

    const [open, setOpen] = useState<boolean>(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} >+ Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[450px] border-foreground/10">
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Add Member Package
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <PkgForm params={params} setOpen={setOpen} />
            </DialogContent>
        </Dialog >
    )
}

