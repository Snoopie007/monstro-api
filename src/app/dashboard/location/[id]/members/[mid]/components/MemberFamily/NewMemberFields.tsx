import React, { useState } from 'react'
import {
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input,
    FormDescription
} from '@/components/forms'

import { UseFormReturn } from 'react-hook-form'
import { AddFamilyMemberSchema } from '../../schema'
import { z } from 'zod'
import { CountryCode } from '@/types/other'
import { CountryCodes } from '@/libs/data'
import PhoneInput from 'react-phone-number-input/input'
import { Member } from '@/types/member'

interface NewMemberFieldsProps {
    form: UseFormReturn<z.infer<typeof AddFamilyMemberSchema>>;
    parent: Member;
}

export default function NewMemberFields({ form, parent }: NewMemberFieldsProps) {
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");

    function useAliasEmail(email: string) {
        const [localPart, domain] = parent.email.split('@');
        const aliasEmail = `${localPart}+${form.getValues('firstName').toLowerCase()}@${domain}`;
        return aliasEmail;
    }

    return (

        <div>

            <fieldset className='grid grid-cols-2 gap-4'>
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">First Name</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">Last Name</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset className='space-y-1'>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">Email </FormLabel>
                            <FormDescription className='text-xs text-muted-foreground'>
                                No email? We can create a proxy email that forwards messages to you.
                                Click the button below to generate one.
                            </FormDescription>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className='text-red-500 text-xs uppercase font-medium cursor-pointer' onClick={() => {
                    form.setValue("email", useAliasEmail(parent.email));
                }}>Generate Proxy Email</div>
            </fieldset>
            <fieldset>
                <div className="flex-1 justify-center space-y-2">
                    <FormLabel size="tiny">Phone</FormLabel>
                    <div className="flex flex-row gap-1">
                        <Select onValueChange={(value: string) => setPhoneRegion(value as CountryCode)} defaultValue={phoneRegion}>
                            <SelectTrigger className="rounded-sm w-[22%] h-auto">
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
                                    <FormControl>
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
        </div>
    )
}
