'use client'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/forms/select"
import { toast } from 'react-toastify';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/forms/form";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { cn, sleep } from '@/libs/utils';
import { Input } from '@/components/forms/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SupportFormSchema } from "../schemas";
import { SupportCategories } from "./support-categories";

export default function TicketForm() {
    const [state, setState] = useState<"loading" | "success" | "error" | null>();

    function isLoading(): boolean {
        return (state === "loading")
    }
    const form = useForm<z.infer<typeof SupportFormSchema>>({
        resolver: zodResolver(SupportFormSchema),
        defaultValues: {
            video: "",
            category: "",
            subject: "",
            content: "",
        },
        mode: "onSubmit",
    })
    async function submitForm(v: z.infer<typeof SupportFormSchema>) {
        setState("loading");
        try {
            const res = await fetch('/api/support', {
                method: "post",
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify(v),
            })

            if (res.ok) {
                const data = await res.json()

                await sleep(2000);
                setState("success")
            }


        } catch (e: any) {
            toast.error("Something went wrong please try again.", { position: "top-center", hideProgressBar: true, closeOnClick: true });
            setState("error")
        }
    }

    return (
        <div>
            {(state !== "success") ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submitForm)} >

                        <fieldset className='px-7 py-4 border-b'>
                            <h5 className='mb-5'>What area are you having problems with?</h5>
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <label className='font-semibold'>Problem area:</label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} >
                                            <FormControl className={"rounded-sm"}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className='max-h-[200px] scroll-smooth'>
                                                {SupportCategories.map((item, i) => (
                                                    <SelectGroup key={i} className='pl-3 pb-3 '>
                                                        <SelectLabel className='text-base -ml-6'>{item.category}</SelectLabel>
                                                        {item.issues.map((issue, index) => (
                                                            <SelectItem key={(issue + index)} value={`${item.category} ${issue}`} className='cursor-pointer py-1 '><span className='text-[.95rem]'>{issue}</span></SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>

                                )}
                            />

                        </fieldset>
                        <fieldset className='px-7 py-4 border-b'>
                            <h5 className='mb-5'>Details of the problem?</h5>
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <label className='font-semibold'>Subject:</label>
                                        <FormControl >
                                            <Input type='text' className={cn("rounded-sm")} {...field} />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>

                                )}
                            />
                            <FormField
                                control={form.control}
                                name="video"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <label className='font-semibold'>Video or Loom url (optional)</label>
                                        <FormControl>
                                            <Input type='text' className={cn("rounded-sm")} placeholder="Loom or video url" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>

                                )}
                            />
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <label className='font-semibold'>Description</label>
                                        <FormControl >
                                            <textarea className={"border w-full rounded-sm bg-transparent resize-none h-40 p-4"} {...field} placeholder='Please include all information relevant to your issue.' />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>


                        <div className="px-8 py-3 bg-black/20 flex justify-end">
                            <Button type='submit'
                                disabled={isLoading()}
                                className={cn("children:hidden py-3 rounded-[4px] hover:bg-white hover:text-black text-sm font-bold  ", (isLoading() && "children:inline-block"))}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Create Case
                            </Button>
                        </div>
                    </form >
                </Form >
            ) : (
                <div className='px-6 py-10'>
                    <div className='text-2xl font-bold mb-3'>We have successfuly created your ticket.</div>
                    <p className='text-lg'>One of Monstro's customer support will be in touch with in the next 24 to 48 business hour to the email you provided.</p>
                    {/* <div className='bg-gray-100 rounded-sm p-4 mt-4'>
                    <b>Your Ticket & Reference Number: </b>{ticketNumber}
                </div> */}
                </div>
            )}
        </div>
    )
}
