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
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/components/icons';
import { CreateMemberSchema } from '../schema';
import PhoneInput from 'react-phone-number-input/input';
import { CountryCodes } from '@/libs/data';
import { CountryCode, MemberPlan, Program } from '@/types';
import NewMemberPaymentForm from './MemberPaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/client/stripe';
import { usePrograms } from '@/hooks/use-programs';
import useSWR from 'swr';
import { PaymentMethods } from '@/libs/data';

interface CreateMemberProps {
    locationId: string
    stripeKey: string | null
}


export default function AddMember({ locationId, stripeKey }: CreateMemberProps) {
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const { mutate } = useSWR(`/api/protected/members`);
    const { data: programs, isLoading: programIsLoading } = usePrograms(locationId);
    const [open, setOpen] = useState(false);
    const [plans, setPlans] = useState<MemberPlan[]>([]);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof CreateMemberSchema>>({
        resolver: zodResolver(CreateMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            billing: {
                name: ""
            },
            planId: undefined,
            programId: undefined,
            paymentMethod: "",
            paymentMode: ""
        },
        mode: "onChange",
    })

    const paymentMethod = form.watch("paymentMethod");
    const programId = form.watch("programId");
    const planId = form.watch("planId");

    useEffect(() => {
        if (programId) {
            setPlans(programs.find((program: Program) => program.id == programId).plans);
        }
    }, [programId]);

    async function onSubmit(v: z.infer<typeof CreateMemberSchema>) {



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
                                <div className='mb-2 border-b border-foreground/20  pb-2'>
                                    <FormLabel className='text-sm font-bold'>
                                        Subscription or Package Details
                                    </FormLabel>

                                </div>
                                <fieldset className='flex flex-row gap-2'>
                                    <FormField
                                        control={form.control}
                                        name="programId"
                                        render={({ field }) => (
                                            <FormItem className='flex-1'>
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
                                    <FormField
                                        control={form.control}
                                        name="planId"
                                        render={({ field }) => (
                                            <FormItem className='flex-1'>
                                                <FormLabel size='tiny'>Select a Plan</FormLabel>
                                                <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                    <FormControl>
                                                        <SelectTrigger disabled={!programId}>
                                                            <SelectValue placeholder="Select a plan" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {plans.map((plan: MemberPlan, index: number) => (
                                                            (plan.contractId && plan.id) ? (
                                                                <SelectItem key={index} value={plan.id?.toString()}>
                                                                    {plan.name}
                                                                </SelectItem>
                                                            ) : null
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
                                {!!planId && (
                                    <React.Fragment>
                                        <div className='mb-4'>
                                            <FormLabel size='tiny'>
                                                Payment Method
                                            </FormLabel>
                                            <FormDescription>
                                                Select the payment method for the member. You can also choose to send an invite link via email for them to add their own payment method.
                                            </FormDescription>
                                        </div>
                                        <fieldset>
                                            <FormField
                                                control={form.control}
                                                name="paymentMethod"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">

                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="capitalize">
                                                                    <SelectValue placeholder="Select Payment Method" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {[...PaymentMethods, "email_invite"].map((method: string, i: number) => (
                                                                    <SelectItem key={i} value={method} className="capitalize"
                                                                        disabled={method === "card" && !stripeKey}
                                                                    >
                                                                        {method.replace("_", " ")}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </fieldset>

                                        {(stripeKey && paymentMethod === "card") && (
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
                        disabled={loading || form.formState.isSubmitting || !form.formState.isValid}
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
