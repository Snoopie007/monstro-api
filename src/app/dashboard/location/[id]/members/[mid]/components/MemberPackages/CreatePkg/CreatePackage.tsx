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
import { VisuallyHidden } from "react-aria";

export function CreatePackage({ params }: { params: { id: string, mid: string } }) {

    const [open, setOpen] = useState<boolean>(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} >+ Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[450px] border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <PkgForm params={params} setOpen={setOpen} />
            </DialogContent>
        </Dialog >
    )
}

