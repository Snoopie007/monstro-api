import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/forms";
import { Sheet, SheetTrigger } from "@/components/ui";
import { Dispatch } from "react";
import { SetStateAction } from "react";

interface NewChildMemberProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    locationId: string;
    stripeKey: string | null;
}

export default function NewChildMember({ open, setOpen, locationId, stripeKey }: NewChildMemberProps) {
    return (
        <Sheet>
            <SheetTrigger>
                New Child Member
            </SheetTrigger>
        </Sheet>
    )
}