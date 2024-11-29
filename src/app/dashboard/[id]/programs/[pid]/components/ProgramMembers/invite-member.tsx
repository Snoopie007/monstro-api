'use client'
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui";
import { Form, Input, FormField, FormLabel, FormMessage, FormItem, FormControl } from "@/components/forms";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/libs/utils";
import { z } from "zod";
import { useState } from "react";
import { inviteMember } from "@/libs/api";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { InviteMemberSchema } from "../../../schemas";

export interface UpdateProgramProps {
    programId: number,
    locationId: string
}
export default function InviteMember({ programId, locationId }: { programId: number, locationId: string }) {
    const [loading, setLoading] = useState<boolean>(false);
    // const { program, mutate } = useProgram(programId);
    const [open, setOpen] = useState<boolean>(false);
    const form = useForm<z.infer<typeof InviteMemberSchema>>({
        resolver: zodResolver(InviteMemberSchema),
        defaultValues: {
            programId: programId,
            email: "",

        },
        mode: "onChange",
    });


    async function submitForm(v: z.infer<typeof InviteMemberSchema>) {
        setLoading(true)
        try {
            const result = await inviteMember(v, locationId);
            console.log(result)

        } catch (error) {
            toast.error("Error inviting the member, please try again.")
            setOpen(false)
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex flex-row gap-1 border-2 rounded-sm border-white font-roboto">+ Invite Member</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <Form {...form}>
                    <form className='' >
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <FormLabel>Member Email</FormLabel>
                                        <FormControl>
                                            <Input type='email' className={cn("")} placeholder="Member Email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>

                                )}
                            />
                        </fieldset>
                    </form>
                </Form>
                <DialogFooter>
                    <Button onClick={form.handleSubmit(submitForm)}
                        className={cn("py-2.5  children:hidden  px-4 rounded-sm text-sm flex flex-row bg-foreground h-auto", (loading && "children:inline-block"))}>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}