
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
    CollapsibleTrigger, CollapsibleContent, Collapsible
} from "@/components/ui";
import { CountryCode, Member } from "@/types";

import { useEffect, useState } from "react";
import {
    Form, FormField, FormLabel, FormMessage, FormItem, FormControl,
    Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/forms/input";
import { cn } from "@/libs/utils";

import { ChevronRight, Loader2 } from "lucide-react";
import { UpdateMemberSchema } from "../../schema";

import PhoneInput from "react-phone-number-input/input";
import { CountryCodes } from "@/libs/datas";


interface UpdateMemberProps {
    member: Member;
}

export default function UpdateMemberProfile({ member }: UpdateMemberProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [phoneRegion, setPhoneRegion] = useState<CountryCode | undefined>("US");

    const form = useForm<z.infer<typeof UpdateMemberSchema>>({
        resolver: zodResolver(UpdateMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
        },
        mode: "onChange",
    })

    useEffect(() => {
        if (member) {
            form.reset({
                ...member,
                lastName: `${member.lastName}`,
                phone: `${member.phone}`,
            });
        }
    }, [member]);

    async function onSubmit(v: z.infer<typeof UpdateMemberSchema>) {

    }

    return (

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} className="border-l  rounded-none">Edit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Update Profile</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-2' >
                            <fieldset className="flex flex-row items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("w-full")} placeholder="First Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />  <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("w-full")} placeholder="Last Name" {...field} />
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
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type='email' className={cn("w-full")} placeholder="Email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex-1  justify-center space-y-2">

                                    <FormLabel className="font-semibold  ">
                                        Phone
                                    </FormLabel>
                                    <div className="flex  flex-row gap-1">
                                        <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>

                                            <SelectTrigger className="rounded-sm w-[22%] h-auto" >
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
                            <Collapsible >
                                <CollapsibleTrigger className="flex group flex-row items-center mt-4  text-indigo-600">
                                    <ChevronRight size={16} className="group-data-[state=open]:rotate-90" />
                                    <span className="font-medium text-sm">Advance options</span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-4 bg-foreground/10 rounded-sm mt-4 space-y-2">

                                    <fieldset className="items-center flex flex-row gap-2">
                                        <FormField
                                            control={form.control}
                                            name="currentPoints"
                                            render={({ field }) => (
                                                <FormItem className="col-span-1">
                                                    <FormLabel>Current Points</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" className="border-none  rounded-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem >
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="reedemPoints"
                                            render={({ field }) => (
                                                <FormItem className="col-span-1">
                                                    <FormLabel>Redeemed Points</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" className="border-none  rounded-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem >
                                            )}
                                        />
                                    </fieldset>
                                </CollapsibleContent>
                            </Collapsible>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("",)}
                        variant={"foreground"}
                        size={"sm"}
                        type="submit"

                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
