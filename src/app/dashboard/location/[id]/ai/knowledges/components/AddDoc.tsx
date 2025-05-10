'use client'
import {
    Button, Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogBody, DialogFooter, DialogClose
} from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { Vendor } from "@/types";


export function AddDoc({ lid }: { lid: string }) {
    const [search, setSearch] = useState<string>("");
    const [customer, setCustomer] = useState<Partial<Vendor> | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [step, setStep] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);

    async function searchCustomer() {
        if (!search) return;
        setLoading(true);
        const { result, error } = await tryCatch(fetch("/api/protected/stripe/customers", {
            method: "POST",
            body: JSON.stringify({ id: search })
        }));

        setLoading(false);

        if (error || !result || !result.ok) {
            toast.error("Failed to search customer");
            return;
        };

        const data = await result?.json();
        const [firstName, lastName] = data.name?.split(" ") || [];
        setCustomer({
            email: data.email,
            phone: data.phone,
            firstName,
            lastName,
            stripeCustomerId: data.id
        });
        setStep(1);
    }

    function handleCancel(open: boolean) {
        if (!open) {
            setSearch("");
            setCustomer(null);
            setStep(0);
        }
        setOpen(open);
    }



    return (
        <Dialog open={open} onOpenChange={handleCancel}>
            <DialogTrigger asChild>
                <Button variant="foreground" size="sm">
                    + Document
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add PDF Document</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-2">

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild onClick={() => setSearch("")}>
                        <Button variant="outline" size="sm">Cancel</Button>
                    </DialogClose>
                    {!customer && (
                        <Button variant="continue" size="sm" onClick={() => searchCustomer()} disabled={loading}>
                            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                            Search
                        </Button>
                    )}

                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}