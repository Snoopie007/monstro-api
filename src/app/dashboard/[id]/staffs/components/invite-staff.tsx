import {
    Button,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogBody
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
import { cn } from '@/libs/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { InviteStaffSchema } from '../schema'
import { DialogClose, DialogDescription } from '@radix-ui/react-dialog'
import { Role } from '@/types';
import { addStaff } from '@/libs/api';
import { toast } from 'react-toastify';

export default function InviteStaff({ roles, locationId }: { roles: Array<Role>, locationId: string }) {
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
        console.log(v);
        const body = {
            ...v
        };
        try {
            await addStaff(body, locationId);
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
                <Button variant={"foreground"} size={"xs"}  >Invite</Button>
            </DialogTrigger>
            <DialogContent className={cn("border-foreground/10 p-0")}>
                <DialogHeader >
                    <DialogTitle>Invite Staff</DialogTitle>
                    <DialogDescription className='text-sm text-foreground/50'>Invite a new staff to your organization</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-4'>
                            <fieldset className='flex flex-row gap-2'>
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>First Name</FormLabel>
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
                                            <FormLabel>Last Description</FormLabel>
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
                                            <FormLabel>Email</FormLabel>
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
                                            <FormLabel>Phone</FormLabel>
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
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={(value) => field.onChange(value)}>
                                                <SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-white">
                                                    <SelectValue placeholder="Select a Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role: Role, index: number) => (
                                                        <SelectItem key={index} value={(role.id as number).toString()}>{role.name}</SelectItem>
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
                        <Button variant="outline" size={"sm"} className='rounded-sm' onClick={() => setOpen(false)}>Cancel</Button>
                    </DialogClose>
                    <Button variant="foreground" size={"sm"} className=' rounded-sm' onClick={form.handleSubmit(onSubmit)}>Save</Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}
