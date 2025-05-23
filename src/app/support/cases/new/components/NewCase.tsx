'use client'

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/forms/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/forms/form"
import { Input } from '@/components/forms/input'
import { Button } from '@/components/ui/button'
import { Textarea } from "@/components/forms"
import { Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { cn, sleep, tryCatch } from '@/libs/utils'
import { z } from 'zod'
import { SupportFormSchema } from "./schemas"
import { SupportCategories, CaseFormSuccess, SeverityOptions } from "."
import { useSession } from "next-auth/react"

type SimpleLocation = {
    id: string;
    name: string;
    status: "active" | "inactive";
}

export function NewCase({ locations }: { locations: SimpleLocation[] }) {
    const [isLoading, setIsLoading] = useState(false)
    const [filteredLocations, setFilteredLocations] = useState<SimpleLocation[]>([])
    const [caseId, setCaseId] = useState<number | null>(null)
    const session = useSession();

    useEffect(() => {
        if (locations.length > 0) {
            const activeLocations = locations.filter((location) => location.status === "active")
            setFilteredLocations(activeLocations)
        }
    }, [locations])

    const form = useForm<z.infer<typeof SupportFormSchema>>({
        resolver: zodResolver(SupportFormSchema),
        defaultValues: {
            locationId: "",
            video: "",
            category: "",
            subject: "",
            message: "",
            severity: "low",
        },
        mode: "onSubmit",
    })

    async function handleSubmit(values: z.infer<typeof SupportFormSchema>) {
        setIsLoading(true)

        const { result, error } = await tryCatch(
            fetch('/api/protected/vendor/support/cases', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            })

        )
        await sleep(2000)
        setIsLoading(false)
        if (error || !result || !result.ok) {
            toast.error("Something went wrong. Please try again.")
            return
        }

        const data = await result.json();
        form.reset()
        setCaseId(data.id)

    }

    if (caseId) {
        return <CaseFormSuccess caseId={caseId} />
    }

    return (
        <div className='space-y-1 border rounded-sm border-foreground/10 '>
            <div className='text-base font-bold px-4 pt-4'>
                How can we help you?
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <div className='p-4 border-b space-y-4 border-foreground/10'>
                        <FormField
                            control={form.control}
                            name="locationId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size="sm">
                                        Which location are you having problems with?
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl className="rounded-sm bg-foreground/5 border-foreground/10">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select location" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className='max-h-[200px] scroll-smooth'>
                                            {filteredLocations.map((l) => (
                                                <SelectItem key={l.id} value={l.id.toString()}>
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <fieldset className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="sm">
                                            What issue are you having?
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl className="rounded-sm bg-foreground/5 border-foreground/10">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className='max-h-[200px] scroll-smooth '>
                                                {SupportCategories.map((item) => (
                                                    <SelectGroup key={item.category}>
                                                        <SelectLabel className='text-[0.65rem] text-muted-foreground uppercase font-bold'>
                                                            {item.category}
                                                        </SelectLabel>
                                                        {item.issues.map((issue) => (
                                                            <SelectItem
                                                                key={issue}
                                                                value={issue}
                                                                className='cursor-pointer '
                                                            >
                                                                <span className='text-sm'>{issue}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="severity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="sm">Severity</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl className="rounded-sm capitalize bg-foreground/5 border-foreground/10">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select severity" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className=' capitalize'>
                                                {SeverityOptions.map((severity) => (
                                                    <SelectItem key={severity} value={severity}>
                                                        {severity}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    </div>

                    <div className='p-4 border-b space-y-4 border-foreground/10'>

                        <fieldset>
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem >
                                        <FormLabel size="sm">Subject:</FormLabel>
                                        <FormControl>
                                            <Input type='text' className="rounded-sm bg-foreground/5 border-foreground/10" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>

                        <fieldset>
                            <FormField
                                control={form.control}
                                name="video"
                                render={({ field }) => (
                                    <FormItem >
                                        <FormLabel size="sm">Loom url (optional)</FormLabel>
                                        <FormControl>
                                            <Input type='text' className="rounded-sm bg-foreground/5 border-foreground/10" placeholder="Loom or video url" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>

                        <fieldset>

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem className="mb-4">
                                        <FormLabel size="sm">Message</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="border rounded-sm bg-foreground/5 resize-none h-40 p-4 border-foreground/10"
                                                placeholder='Please include all information relevant to your issue.'
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    </div>

                    <div className="p-4 space-y-2">
                        <div className='text-sm bg-foreground/5 border rounded-sm p-3 text-muted-foreground border-foreground/10'>
                            Expected response time is based on your billing plan.
                            Support hours are 9am-6pm EST Mon-Fri. We're off on all public holidays.
                        </div>
                        <Button
                            type='submit'
                            variant="foreground"
                            disabled={isLoading}
                            className={cn(
                                "children:hidden w-full",
                                isLoading && "children:inline-block"
                            )}
                        >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />
                            Create Case
                        </Button>
                        <p className='text-sm text-muted-foreground text-right'>
                            We will contact you at <b>{session.data?.user.email}</b>
                            <br />
                            Please ensure emails from <b>mymonstro.com</b> are allowed
                        </p>
                    </div>
                </form>
            </Form>
        </div>
    )
}
