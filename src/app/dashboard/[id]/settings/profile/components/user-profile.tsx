'use client'
import { Button, Card, } from "@/components/ui";
import {
    Form,
    FormField,
    FormLabel,
    FormControl,
    FormItem,
    FormMessage,
    Input, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/forms";
import { cn } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Select } from "@radix-ui/react-select";
import { useMemo, useState } from "react";
import { CountryCode, Staff } from "@/types";
import PhoneInput from "react-phone-number-input/input";
import UserAvatar from "./avatar";
import { CountryCodes } from "@/libs/datas";

export function UserProfile({ staff, locationId }: { staff: Staff, locationId: string }) {
    const [avatar, setAvatar] = useState<string>(staff.image);
    const [phoneRegion, setPhoneRegion] = useState<CountryCode | undefined>("US");
    const form = useForm()
    function handleSubmit(v: any) {
        console.log(v)
    }

    const userAvatar = useMemo(() => {
        return {
            currentAvatar: avatar,
            onChange: (url: string) => {
                setAvatar(url)
            }
        }
    }, [avatar])

    return (
        <Card className='rounded-sm'>
            <div className='border-b  px-4 py-3'>
                <span>General Information</span>
            </div>
            <div className="px-6 py-8 ">
                <UserAvatar currentAvatar={null} onChange={userAvatar.onChange} locationId={locationId} />
                <Form {...form}>
                    <form id="profile">
                        <input type="hidden" name="logo" value={""} />
                        <input type="hidden" name="id" value={form.getValues('id')} />
                        <fieldset>
                            <div className="flex gap-4">
                                <FormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel className="font-semibold">
                                            First Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="text" className="rounded-sm" placeholder="First Name" {...field} />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel className="font-semibold">
                                            Last Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="text" className="rounded-sm" placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                        </fieldset>
                        <fieldset className="mt-4">
                            <div className="flex flex-row gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className="font-semibold">
                                                Email
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="email" className="rounded-sm" placeholder="Email"  {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex-1 justify-center space-y-2">
                                    <FormLabel className="font-semibold  ">
                                        Phone
                                    </FormLabel>
                                    <div className="flex  flex-row gap-1">
                                        <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>

                                            <SelectTrigger className="rounded-sm w-[22%] h-auto" >
                                                <SelectValue defaultValue={""} />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {CountryCodes.map((country, index) => (
                                                    <SelectItem key={index} value={country.code}>
                                                        {country.name}
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
                                                            className="rounded-sm bg-transparent inline-block w-full border py-1.5 px-4"
                                                            value={value}
                                                            withCountryCallingCode={true}

                                                            international={true}
                                                            onChange={onChange}
                                                            country={phoneRegion}
                                                        />
                                                    </FormControl>

                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </form>
                </Form>
            </div>
            <div className="border-t py-3 px-6  text-right">
                <Button
                    onSubmit={form.handleSubmit(handleSubmit)}
                    variant={"foreground"}
                    size={"sm"}
                    className={cn("children:hidden")}
                    type="submit"
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Update
                </Button>
            </div>
        </Card >
    )
}
