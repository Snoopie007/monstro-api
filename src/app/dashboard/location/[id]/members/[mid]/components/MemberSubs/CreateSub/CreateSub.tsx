'use client'
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui";
import { useState } from "react";
import React from "react";
import { SubForm } from "./SubForm";
import { VisuallyHidden } from "react-aria";
import { useSubscriptions } from "@/hooks";
import { MemberSubscription } from "@/types";
import { useMemberStatus } from "../../../providers";

export function CreateSubscription({ params }: { params: { id: string, mid: string } }) {
    const [open, setOpen] = useState<boolean>(false);
    const { subscriptions } = useSubscriptions(params.id)
    const { updateMember } = useMemberStatus()

    async function handleFinish(data: MemberSubscription) {
        setOpen(false)
        updateMember((prev) => ({
            ...prev,
            subscriptions: [...(prev.subscriptions || []), data]
        }))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                <Button variant={"create"} size={"sm"} >+ Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <SubForm lid={params.id} subs={subscriptions || []} mid={params.mid} onFinish={handleFinish} />
            </DialogContent>
        </Dialog >
    )
}

