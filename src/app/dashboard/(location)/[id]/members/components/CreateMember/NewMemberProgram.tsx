import React, { SetStateAction, Dispatch } from 'react'
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Program, MemberPlan } from '@/types';
import { Switch } from '@/components/ui';
import { MemberProgramSchema } from '../../schema';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Button, DialogBody, DialogClose, DialogFooter } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import {
    Form, FormField, FormItem, FormLabel, FormMessage,
    FormControl, Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem, FormDescription
} from '@/components/forms';

import { SubFields } from './SubFields';

import { CreateMemberProgress } from './AddMember';
import { PkgFields } from './PkgFields';

type NewMemberProgramProps = {
    lid: string,
    progress: CreateMemberProgress,
    setProgress: Dispatch<SetStateAction<CreateMemberProgress>>
}

export default function NewMemberProgram({ lid, progress, setProgress }: NewMemberProgramProps) {
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [plans, setPlans] = useState<MemberPlan[]>([]);
    const [plan, setPlan] = useState<MemberPlan | null>(null);

    const form = useForm<z.infer<typeof MemberProgramSchema>>({
        resolver: zodResolver(MemberProgramSchema),
        defaultValues: {
            memberPlanId: undefined,
            startDate: new Date(),
            other: {
                programId: undefined,
                cardId: undefined,
                skipContract: false,
            },
            pkg: {
                expireDate: undefined,
                totalClassLimit: undefined,
            },
            sub: {
                endDate: undefined,
                trailDays: undefined,
                allowProration: undefined,
            },
        },
        mode: "onSubmit",
    })


    useEffect(() => {
        fetchPrograms()
    }, [progress])

    async function fetchPrograms() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs`)
        )

        if (error || !result?.ok) return;
        const data = await result.json()
        const filteredPrograms = data.filter((program: Program) => program.plans.length > 0)
        setPrograms(filteredPrograms)
    }

    async function onSubmit(v: z.infer<typeof MemberProgramSchema>) {
        if (!plan) return;
        setLoading(true)
        const { pkg, sub, ...rest } = v

        const isOneTime = plan?.type === 'one-time'



        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/members/${progress.member?.id}/${isOneTime ? 'packages' : 'subscriptions'}`, {
                method: "POST",
                body: JSON.stringify({
                    ...rest,
                    stripePaymentMethod: progress.stripePaymentMethod,
                    paymentMethod: progress.paymentMethod,
                    pkg: isOneTime ? { ...pkg } : { ...sub }
                })
            })
        )
        setLoading(false)
        if (error || !result?.ok) return;
        const data = await result.json()
        form.reset()
        // setOpen(false)

        toast.success("Subscription created successfully")

    }

    function handleOpenChange(open: boolean) {
        // setOpen(open)
        if (!open) {
            form.reset()
        }
    }
    return (
        <>
            <DialogBody >
                <Form {...form}>
                    <form className='space-y-1' >

                        <fieldset className='grid grid-cols-2 gap-2 items-center'>
                            <FormField
                                control={form.control}
                                name="other.programId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Select a Program</FormLabel>
                                        <Select onValueChange={(value) => {
                                            field.onChange(Number(value))
                                            setPlans(programs.find((program: Program) => program.id == Number(value))?.plans || [])
                                        }}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-sm">
                                                    <SelectValue placeholder="Select a program" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {programs && programs.map((program: Program, index: number) => (
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
                                name="memberPlanId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Select a Plan</FormLabel>
                                        <Select disabled={!form.getValues("other.programId")}
                                            onValueChange={(value) => {
                                                field.onChange(Number(value))
                                                setPlan(plans.find((plan: MemberPlan) => plan.id == Number(value)) || null)
                                            }} >
                                            <FormControl>
                                                <SelectTrigger className="rounded-sm">
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {plans && plans.map((plan: MemberPlan, index: number) => (
                                                    (plan.contractId && plan.id) ? <SelectItem key={index} value={plan.id?.toString()}>{plan.name}</SelectItem> : null
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                        {plan && plan.contractId && (
                            <fieldset className='mb-2'>
                                <FormField
                                    control={form.control}
                                    name="other.skipContract"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">

                                            <FormControl>
                                                <Switch
                                                    disabled={!plan?.contractId}
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm">
                                                    Skip contract
                                                </FormLabel>
                                                <FormDescription className="text-xs">
                                                    This will skip the contract step and create the subscription immediately.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        )}
                        {plan && plan.type === "recurring" && (
                            <SubFields form={form} paymentMethod={progress.paymentMethod} />
                        )}
                        {plan && plan.type === "one-time" && (
                            <PkgFields form={form} paymentMethod={progress.paymentMethod} />
                        )}
                    </form>
                </Form>
            </DialogBody>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
                </DialogClose>
                <Button
                    className={cn("children:hidden", loading && "children:block")}
                    variant={"foreground"}
                    size={"sm"}
                    type="submit"
                    disabled={loading || !form.formState.isValid}
                    onClick={form.handleSubmit(onSubmit)}
                >
                    <Loader2 className="mr-2 h-4 w-4  animate-spin" />
                    Create
                </Button>
            </DialogFooter></>
    )
}
