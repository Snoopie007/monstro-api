import {
    Button,
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    ScrollArea,
} from '@/components/ui';

import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel, FormDescription,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
} from '@/components/forms';
import { cn, sleep, tryCatch } from "@/libs/utils";
import { z } from "zod";
import React, { SetStateAction, Dispatch, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/components/icons';
import { CreateMemberSchema } from '../../schema';
import PhoneInput from 'react-phone-number-input/input';
import { CountryCodes } from '@/libs/data';
import { CountryCode } from '@/types';

import useSWR from 'swr';

import { toast } from 'react-toastify';
import { CreateMemberProgress } from './AddMember';



type CreateMemberFormProps = {
    lid: string,
    progress: CreateMemberProgress,
    setProgress: Dispatch<SetStateAction<CreateMemberProgress>>
}

export default function CreateMemberForm({ lid, progress, setProgress }: CreateMemberFormProps) {
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const { mutate } = useSWR(`/api/protected/members`);

    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof CreateMemberSchema>>({
        resolver: zodResolver(CreateMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
        },
        mode: "onSubmit",
    })


    async function onSubmit(v: z.infer<typeof CreateMemberSchema>) {

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/members/new`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    progress
                }),
            })
        )
        setLoading(false)
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong");
            return;
        }
        const data = await result.json();
        console.log(data)
        await mutate();
        form.reset();
        setProgress({
            ...progress,
            step: 2,
            member: data
        })
    }
    function generatePassword() {
        // Define character sets
        const chars = {
            lower: "abcdefghijklmnopqrstuvwxyz",
            upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            nums: "0123456789",
            syms: "!@$"
        };

        // Create initial password with one of each type
        let pwd = [
            chars.lower[Math.floor(Math.random() * chars.lower.length)],
            chars.upper[Math.floor(Math.random() * chars.upper.length)],
            chars.nums[Math.floor(Math.random() * chars.nums.length)],
            chars.syms[Math.floor(Math.random() * chars.syms.length)]
        ];

        // Add 6 more random characters from all types
        const allChars = chars.lower + chars.upper + chars.nums + chars.syms;
        for (let i = 0; i < 6; i++) {
            pwd.push(allChars[Math.floor(Math.random() * allChars.length)]);
        }

        // Shuffle and return
        return pwd.sort(() => Math.random() - 0.5).join('');
    }

    return (
        <>

            <DialogBody>
                <Form {...form}>
                    <form className='space-y-3' >
                        <fieldset className='flex flex-row items-center gap-2'>
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size='tiny'>First Name</FormLabel>
                                        <FormControl>
                                            <Input type='text' placeholder="First Name" {...field} />
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
                                        <FormLabel size='tiny'>Last Name</FormLabel>
                                        <FormControl>
                                            <Input type='text' placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>

                                )}
                            />
                        </fieldset>
                        <fieldset className="flex flex-row items-center gap-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size='tiny'>Email</FormLabel>
                                        <FormControl>
                                            <Input type='email' placeholder="Email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex-1  justify-center ">

                                <FormLabel size='tiny'>
                                    Phone
                                </FormLabel>
                                <div className="flex flex-row gap-1">
                                    <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>

                                        <SelectTrigger className="rounded-sm w-[30%] h-auto" >
                                            <SelectValue defaultValue={"US"} />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {CountryCodes.map((country, index) => (
                                                <SelectItem key={index} value={country.code}>
                                                    {country.shortName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field: { onChange, value } }) => (
                                            <FormItem className="flex-1">

                                                <FormControl >

                                                    <PhoneInput
                                                        type="tel"
                                                        className="rounded-sm bg-background inline-block w-full border py-1.5 px-4"
                                                        value={value}
                                                        withCountryCallingCode={true}
                                                        international={true}
                                                        country={phoneRegion}
                                                        onChange={onChange}
                                                    />
                                                </FormControl>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                            </div>
                        </fieldset>
                        <fieldset >
                            <div className='flex flex-col gap-2'>
                                <FormLabel size='tiny'>Password</FormLabel>
                                <div className='flex flex-row gap-2'>
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem className='flex-1'>

                                                <FormControl>
                                                    <div className='flex flex-row'>
                                                        <Input type='password' className={cn("w-full border-r-0 rounded-r-none")} placeholder="Password" {...field} />
                                                        <div className='flex-initial bg-indigo-500 text-xs flex border border-white border-l-0 rounded-l-none  cursor-pointer items-center justify-center py-1 px-2 text-white rounded-sm'
                                                            onClick={() => { form.setValue("password", generatePassword()); form.trigger("password") }}>
                                                            Generate
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                </div>
                            </div>
                        </fieldset>

                    </form>
                </Form>
            </DialogBody>
            <DialogFooter >
                <DialogClose asChild>
                    <Button variant={"outline"} size={"sm"} className="">Cancel</Button>
                </DialogClose>
                <DialogClose asChild >
                    <Button
                        variant={"foreground"}
                        size={"sm"}
                        disabled={loading || form.formState.isSubmitting || !form.formState.isValid}
                        onClick={form.handleSubmit(onSubmit)}
                        className={cn("children:hidden", (loading && "children:inline-block"))}
                    >
                        <Icon name="LoaderCircle" className="mr-2  animate-spin" />
                        Continue
                    </Button>
                </DialogClose>
            </DialogFooter>

        </>
    )
}
