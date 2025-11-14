import {
    Button,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogBody,
    DialogClose
} from '@/components/ui/';
import {
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/forms';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/forms/form'
import { cn, tryCatch } from '@/libs/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { InviteStaffSchema } from '../schema'
import { Role } from '@/types';
import { toast } from 'react-toastify';
import { VisuallyHidden } from 'react-aria';
import { Loader2, PlusIcon } from 'lucide-react';

export default function InviteStaff({ roles, lid }: { roles: Array<Role>, lid: string }) {
    const [open, setOpen] = useState<boolean>(false);
    const form = useForm<z.infer<typeof InviteStaffSchema>>({
        resolver: zodResolver(InviteStaffSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "",
        },
        mode: "onChange",
    })

    async function onSubmit(v: z.infer<typeof InviteStaffSchema>) {
        if (form.formState.isSubmitting) return;


        try {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/staffs`, {
                    method: "POST",
                    body: JSON.stringify(v)
                })
            )

            if (error || !result || !result.ok) {
                toast.error("Something went wrong, please try again later");
                return;
            }

            toast.success("Staff Added");
            setOpen(false);
        } catch (error) {
            console.error("Error:", error); // Add logging for debugging
            toast.error("Something went wrong, please try again later");
        }
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"primary"} className=" flex flex-row items-center gap-2" >
                    <span>Invite</span>
                    <PlusIcon className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className={cn("border-foreground/10 p-0")}>
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-2'>
                            <fieldset className='flex flex-row gap-2'>
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel size={'tiny'}>First Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("")} placeholder="First Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel size={'tiny'}>Last Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("")} placeholder="Last Name" {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={'tiny'}>Email</FormLabel>
                                            <FormControl>
                                                <Input type='email' className={cn("")} placeholder="Email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={'tiny'}>Phone</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("")} placeholder="Phone" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem className='flex-initial min-w-[30%]'>
                                            <FormLabel size={'tiny'}>Role</FormLabel>
                                            <Select onValueChange={(value) => field.onChange(value)}>
                                                <SelectTrigger className="w-full border border-foreground/10 font-normal">
                                                    <SelectValue placeholder="Select a Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role: Role, index: number) => (
                                                        <SelectItem key={index} value={role.id}>{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter >
                    <DialogClose asChild>
                        <Button variant="outline" size={"sm"} onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant="foreground" size={"sm"} onClick={form.handleSubmit(onSubmit)}
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? <Loader2 className='size-3.5 animate-spin' /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}
