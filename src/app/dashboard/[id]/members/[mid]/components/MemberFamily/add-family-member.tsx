import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogBody,
    TableRow,
    TableHead,
    TableCell,
    TableBody,
    Table,
    TableHeader,
} from "@/components/ui";

import { Member } from "@/types";
import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn, } from "@/libs/utils";

import { AddCreditCardSchema } from "@/libs/schemas";
import { z } from "zod";
import { toast } from "react-toastify";
import { Checkbox, Input, Select, SelectValue, SelectTrigger, SelectItem, SelectContent } from "@/components/forms";


interface AddPaymentMethodProps {
    member: Member;
    locationId: string;
}

export default function AddFamilyMember({ member, locationId }: AddPaymentMethodProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)


    async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {

    }

    return (

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} className="border-l text-lg rounded-none">+</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] rounded-sm">
                <DialogHeader className="space-y-0">
                    <DialogTitle className="text-base">Attach a Member</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">Add a family to this member by searching for their name.</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <div className="flex flex-col gap-4">
                        <div className="flex-1">

                            <Input placeholder="Search for a member" className="rounded-xs" />
                        </div>
                        <div className={cn("flex-1 space-y-2", { "hidden": false })}>

                            <div className="bg-foreground/5 p-4 rounded-xs" >
                                <div className="text-sm text-muted-foreground mb-3">
                                    We found 4 members.
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            {["", "First Name", "Last Name", "Phone", "Email"].map((header, i) => (
                                                <TableHead key={i} className={cn("text-sm h-auto pt-2 pb-1", { "pl-0": i === 0 })}>
                                                    {header}
                                                </TableHead>
                                            ))}

                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[{ firstName: "John", lastName: "Doe", phone: "#6772e5", email: "#6772e5" }].map((m, i) => (
                                            <TableRow key={i} className="hover:bg-transparent">
                                                <TableCell className="flex flex-row items-center gap-2 pl-0">
                                                    <Checkbox onClick={() => setSelectedMember(member)} className="border-foreground/80" />
                                                </TableCell>
                                                <TableCell >  {m.firstName}</TableCell>
                                                <TableCell>{m.lastName}</TableCell>
                                                <TableCell>{m.phone}</TableCell>
                                                <TableCell>{m.email}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                            </div>
                            {selectedMember && (
                                <div className=" py-4 rounded-sm">
                                    <Select>
                                        <SelectTrigger className="rounded-xs">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Father", "Mother", "Child", "Sibling", "Grandparent", "Grandchild", "Other"].map((role, i) => (
                                                <SelectItem key={i} value={role}>{role}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
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
                        Next
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>

    )
}
