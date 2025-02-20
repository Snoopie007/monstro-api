import {
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
    SheetSection,
    ScrollArea
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
import { cn, sleep } from "@/libs/utils";
import { z } from "zod";
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/components/icons';
import { CreateMemberSchema } from '../schema';
import PhoneInput from 'react-phone-number-input/input';
import { CountryCodes } from '@/libs/data';
import { CountryCode, Plan, Program } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/forms';
import NewMemberPaymentForm from './MemberPaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/stripe';
import { usePrograms } from '@/hooks/use-programs';
import { addMemberManually } from '@/libs/api';
import paymentmethods from "@/jsons/payment-methods.json";
import useSWR from 'swr';


interface CreateMemberProps {
    locationId: string
    stripeKey: string | null
}

const paymentMethods: { label: string, value: string }[] = paymentmethods;

export default function AddMember({ locationId, stripeKey }: CreateMemberProps) {
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const { mutate } = useSWR(`/api/protected/members`);
    const { data: programs, isLoading: programIsLoading } = usePrograms(locationId);
    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof CreateMemberSchema>>({
        resolver: zodResolver(CreateMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            billing: {
                stripeToken: "",
                cardHolderName: ""
            },
            planId: 0,
            programId: 0,
            paymentMethod: "",
            paymentMode: ""
        },
        mode: "onChange",
    })
    const watchPaymentMethod = form.watch("paymentMethod"); // Watch for changes
    async function onSubmit(v: z.infer<typeof CreateMemberSchema>) {
        // console.log(v);
        const member = await addMemberManually(v, locationId);
        console.log(member);
        await mutate();
        form.reset();
    }
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size={"sm"} variant={"foreground"} className='h-auto py-1 text-xs rounded-xs border'>
                    + Member
                </Button>
            </SheetTrigger>

            <SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0" aria-modal>
                <SheetHeader className="">
                    <SheetTitle>Add a Member</SheetTitle>
                    <SheetDescription>
                        Add a new member to your organization
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className='h-[calc(100vh-150px)]'>


                    <Form {...form}>
                        <form className='' >
                            <SheetSection>

                                <fieldset className='flex flex-row items-center gap-2'>
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size='tiny'>First Name</FormLabel>
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
                                                <FormLabel size='tiny'>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input type='text' className={cn("")} placeholder="Last Name" {...field} />
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
                                                    <Input type='email' className={cn("w-full")} placeholder="Email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex-1  justify-center space-y-2">

                                        <FormLabel size='tiny'>
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
                            </SheetSection>
                            <SheetSection >
                                <div className='mb-4'>
                                    <FormLabel className='text-sm font-bold'>
                                        Enroll in a Program
                                    </FormLabel>
                                    <FormDescription>
                                        Check this box to enroll the member in a program and plan.
                                    </FormDescription>
                                </div>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="programId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size='tiny'>Select a Program</FormLabel>
                                                <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a program" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {!programIsLoading && programs.map((program: Program, index: number) => (
                                                            program.plans.length ? <SelectItem key={index} value={program.id.toString()}>{program.name}</SelectItem> : null
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="planId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size='tiny'>Select a Plan</FormLabel>
                                                <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a plan" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {form.getValues("programId") && programs.find((program: Program) => program.id == form.getValues("programId")).plans.map((plan: Plan, index: number) => (
                                                            (plan.contractId && plan.id) ? <SelectItem key={index} value={plan.id?.toString()}>{plan.name}</SelectItem> : null
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size='tiny'>Payment Method</FormLabel>

                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Payment Method" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {paymentMethods.map((interval, index) => (
                                                            <SelectItem key={index} value={interval.value}>{interval.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>

                            </SheetSection>
                            <SheetSection>
                                {watchPaymentMethod === "stripe" && (
                                    <React.Fragment>
                                        <div className='mb-4'>
                                            <FormLabel size='tiny'>
                                                Payment Mode
                                            </FormLabel>
                                            <FormDescription>
                                                Select whether you want to add a payment mode for the member or send an invite link via email for them to add their own payment method.
                                            </FormDescription>
                                        </div>
                                        <fieldset>
                                            <FormField
                                                control={form.control}
                                                name="paymentMode"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">

                                                        <FormControl>
                                                            <RadioGroup
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                                className="flex flex-col space-y-1"
                                                            >
                                                                <FormItem className="flex items-center space-x-2 space-y-0 ">
                                                                    <FormControl>
                                                                        <RadioGroupItem value="free" />
                                                                    </FormControl>
                                                                    <FormLabel >
                                                                        Add member without payment.
                                                                    </FormLabel>
                                                                </FormItem>

                                                                <FormItem className="flex items-center space-x-2 space-y-0 ">
                                                                    <FormControl>
                                                                        <RadioGroupItem value="invite" />
                                                                    </FormControl>
                                                                    <FormLabel >
                                                                        Email invoice to the customer to pay manually.
                                                                    </FormLabel>
                                                                </FormItem>
                                                                <FormItem className="flex items-center space-x-2 space-y-0 ">
                                                                    <FormControl>
                                                                        <RadioGroupItem disabled={!stripeKey} value="card" />
                                                                    </FormControl>
                                                                    <FormLabel >
                                                                        Add a payment method on behave of the customer .
                                                                    </FormLabel>

                                                                </FormItem>

                                                            </RadioGroup>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                        </fieldset>

                                        {stripeKey && (
                                            <Elements
                                                stripe={getStripe(stripeKey)}
                                                options={{
                                                    appearance: {
                                                        variables: {
                                                            colorIcon: "#6772e5",
                                                            fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                                                        },
                                                    },
                                                }}
                                            >
                                                <NewMemberPaymentForm form={form} />

                                            </Elements>
                                        )}
                                    </React.Fragment>
                                )}

                            </SheetSection>

                        </form>
                    </Form>
                </ScrollArea>


                <SheetFooter className='border-t py-4 px-5'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"} className="">Cancel</Button>
                    </SheetClose>
                    <Button
                        variant={"foreground"}
                        size={"sm"}
                        onClick={form.handleSubmit(onSubmit)}
                        className={cn("children:hidden", (loading && "children:inline-block"))}
                    >
                        <Icon name="LoaderCircle" className="mr-2  animate-spin" />
                        Save
                    </Button>
                </SheetFooter>


            </SheetContent>
        </Sheet >
    )
}
