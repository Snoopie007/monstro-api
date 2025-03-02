import { Member, MemberPlan } from '@/types/member';
import { SetStateAction, Dispatch, useState } from 'react'
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogBody
} from "@/components/ui";
import { DialogDescription } from '@radix-ui/react-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Form, FormControl, FormField, FormItem, FormLabel, Input, FormMessage, RadioGroupItem, RadioGroup, FormDescription, Label } from '@/components/forms';
import { cn } from '@/libs/utils';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AddChildMemberSchema } from '../../schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemberPaymentMethods } from '../../providers/MemberContext';
import { CountryCode } from '@/types/other';
import { CountryCodes } from '@/libs/data';
import PhoneInput from 'react-phone-number-input/input';
import { usePrograms } from '@/hooks/use-programs';
import { Program } from '@/types/program';

interface AddChildMemberProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    parent: Member;
    locationId: string;
}

export default function AddChildMember({ open, setOpen, parent, locationId }: AddChildMemberProps) {
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const { data: programs, isLoading: programIsLoading } = usePrograms(locationId);
    const [plan, setPlan] = useState<string>("existing");

    const form = useForm<z.infer<typeof AddChildMemberSchema>>({
        resolver: zodResolver(AddChildMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            family: {
                relationship: "",
            },
        },
        mode: "onChange",
    })

    async function onSubmit(v: z.infer<typeof AddChildMemberSchema>) {
        console.log(v);
    }



    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogContent className="sm:max-w-[450px] rounded-sm">
                <DialogHeader className="space-y-0">
                    <DialogTitle className="text-base">Add a Child Member</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">Add a new child member to this family.</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                            <fieldset className='grid grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
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
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email (optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <fieldset >
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
                            <fieldset>
                                <div className='mb-4'>
                                    <FormLabel className='text-sm font-bold'>
                                        Select a plan
                                    </FormLabel>
                                    <FormDescription>
                                        You can add the child to a family plan or add it to a different plan.
                                    </FormDescription>
                                </div>
                                <RadioGroup
                                    onValueChange={(value) => { setPlan(value) }}
                                    value={plan}
                                    className="flex flex-col space-y-1"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="existing" id="existing" />
                                        <Label htmlFor="existing">Use existing family plan.</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="new" id="new" />
                                        <Label htmlFor="new">Add to a different plan.</Label>
                                    </div>


                                </RadioGroup>
                            </fieldset>
                            {plan === "existing" && (
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="family.existingPlanId"
                                        render={({ field }) => (
                                            <FormItem>

                                                <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                    <FormControl>
                                                        <SelectTrigger className="rounded-xs">
                                                            <SelectValue placeholder="Select a family plan" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {[{ id: 1, name: "Plan 1" }, { id: 2, name: "Plan 2" }, { id: 3, name: "Plan 3" }].map((plan: any, index: number) => (
                                                            <SelectItem key={index} value={plan.id?.toString()}>{plan.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            )}
                            {plan === "new" && (
                                <div className=' bg-foreground/5 p-3 rounded-xs space-y-3'>
                                    <fieldset className='grid grid-cols-2 gap-4'>
                                        <FormField
                                            control={form.control}
                                            name="family.programId"
                                            render={({ field }) => (
                                                <FormItem>

                                                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                        <FormControl>
                                                            <SelectTrigger className="rounded-xs">
                                                                <SelectValue placeholder="Select a program" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {programs.map((program: Program, index: number) => (
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
                                            name="family.planId"
                                            render={({ field }) => (
                                                <FormItem>

                                                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                        <FormControl>
                                                            <SelectTrigger className="rounded-xs">
                                                                <SelectValue placeholder="Select a plan" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {form.getValues("family.programId") && programs.find((program: Program) => program.id == form.getValues("family.programId")).plans.map((plan: MemberPlan, index: number) => (
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
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>

                                                    <FormControl>
                                                        <Select>
                                                            <SelectTrigger className="rounded-xs">
                                                                <SelectValue placeholder="Select payment method" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {paymentMethods.map((pm, i) => (
                                                                    <SelectItem key={i} value={pm.id}>{pm.id}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </fieldset>
                                </div>
                            )}
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"xs"} >Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("children:hidden", { "children:inline-flex": loading })}
                        variant={"foreground"}

                        size={"xs"}
                        type="submit"

                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Add Child
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}

