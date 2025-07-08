import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui";
import { useState } from "react";
import React from "react";
import { PkgForm } from "./PkgForm";
import { VisuallyHidden } from "react-aria";
import { usePackages } from "@/hooks";
import { useMemberStatus } from "../../../providers";
import { MemberPackage } from "@/types";

export function CreatePackage({ params }: { params: { id: string, mid: string } }) {

    const [open, setOpen] = useState<boolean>(false);
    const { packages } = usePackages(params.id)
    const { updateMember } = useMemberStatus()

    async function handleFinish(data: MemberPackage) {
        setOpen(false)
        updateMember((prev) => ({
            ...prev,
            packages: [...(prev.packages || []), data]
        }))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"create"} size={"sm"} >+ Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[450px] border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <PkgForm lid={params.id} mid={params.mid} pkgs={packages || []} onFinish={handleFinish} />
            </DialogContent>
        </Dialog >
    )
}

