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
    TagInput,
    Checkbox,
} from '@/components/forms';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/forms/form'
import { cn } from '@/libs/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { InviteStaffSchema } from '../schema'
import { DialogClose, DialogDescription } from '@radix-ui/react-dialog'

export default function InviteStaff() {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof InviteStaffSchema>>({
        resolver: zodResolver(InviteStaffSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: [],
            changePassword: false
        },
        mode: "onChange",
    })

    async function onSubmit(v: z.infer<typeof InviteStaffSchema>) {

    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"foreground"} className="h-auto py-2" >Invite</Button>
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
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <FormControl>
                                                <TagInput data={["admin", "staff", "coach"]} value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className='py-2'>
                                <FormField
                                    control={form.control}
                                    name="changePassword"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-start gap-2 space-y-0 ">
                                            <FormControl>
                                                <Checkbox
                                                    className='border-foreground'
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className='mt-0 '>
                                                Require to change their password when they first sign in
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter >
                    <DialogClose asChild>
                        <Button variant="outline" size={"sm"} className='rounded-sm' onClick={() => { setOpen(false); }}>Cancel</Button>
                    </DialogClose>
                    <Button variant="foreground" size={"sm"} className=' rounded-sm' onClick={() => { setOpen(false); form.handleSubmit(onSubmit) }}>Save</Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}
