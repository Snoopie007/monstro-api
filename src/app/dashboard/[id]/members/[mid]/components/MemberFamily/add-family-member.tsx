import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogBody,
} from "@/components/ui";

import { Member } from "@/types";
import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn, } from "@/libs/utils";

import { AddCreditCardSchema } from "@/libs/schemas";
import { z } from "zod";
import { toast } from "react-toastify";

interface AddPaymentMethodProps {
    member: Member;
    locationId: string;
}

export default function AddFamilyMember({ member, locationId }: AddPaymentMethodProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)


    async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {

    }

    return (

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} className="border-l text-lg rounded-none">+</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] rounded-sm">
                <DialogHeader>
                    <DialogTitle>Attach a Member</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("children:hidden", { "children:inline-flex": loading })}
                        variant={"foreground"}

                        size={"sm"}
                        type="submit"

                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Add Card
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>

    )
}
