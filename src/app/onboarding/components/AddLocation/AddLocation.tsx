"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { LocationSetupSchema } from "@/libs/schemas";
import { AutoComplete } from "./GoogleAutoComplete";
import {
    Form, FormItem, FormMessage, FormField, Input, FormControl, FormLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/forms";

import { useSession } from "next-auth/react";
import { useOnboarding } from "../../provider/OnboardingProvider";
import { toast } from "react-toastify";
import { Industries } from "@/libs/data";

export default function AddLocation() {
    const { progress, updateProgress } = useOnboarding();
    const [loading, setLoading] = useState<boolean>(false);
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [edit, setEdit] = useState<boolean>(false);
    const { data: session } = useSession();

    const form = useForm<z.infer<typeof LocationSetupSchema>>({
        resolver: zodResolver(LocationSetupSchema),
        defaultValues: {
            name: "",
            industry: "",
            phone: "",
            website: "",
            address: "",
            city: "",
            country: "USA",
            state: "",
            postalCode: "",
            logoUrl: "",
        },
        mode: "onChange",
    });

    function selectAddress(result: Record<string, any>) {
        const { metadata, ...rest } = result;

        form.reset(rest);
        setMetadata(metadata);
        setEdit(true);
    }


    async function submit(v: z.infer<typeof LocationSetupSchema>) {

        if (!form.formState.isValid) return;

        setLoading(true);

        const { result, error } = await tryCatch(
            fetch("/api/protected/location", {
                method: "POST",
                body: JSON.stringify({
                    vendorId: session?.user?.id,
                    ...v,
                    metadata,
                }),
            })
        );

        await sleep(2000);
        setLoading(false);
        if (error) {
            toast.error("Failed to add location, please try again.");
        }
        const data = await result?.json();

        updateProgress({
            ...progress,
            currentStep: 2,
            completedSteps: [1]
        });
    }

    function remove() {
        form.reset({});
        setEdit(false);
    }


    return (
        <div className="space-y-4">
            <AutoComplete onSelectChange={selectAddress} />

            {edit && (
                <div className="bg-background border border-foreground text-foreground p-4 pb-8 space-y-2 rounded-sm">
                    <p className="text-sm font-medium border-b border-foreground/10  pb-2">Double check your information.</p>
                    <ul className="space-y-2 list-disc list-inside ">

                        {form.formState.errors && Object.keys(form.formState.errors).map((key) => (
                            <li key={key} className=" text-red-500 text-xs">{form.formState.errors[key as keyof z.infer<typeof LocationSetupSchema>]?.message}</li>
                        ))}

                    </ul>
                    <Form {...form}>
                        <form className="space-y-2 ">
                            <fieldset className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[0.65rem]  uppercase font-semibold">Business Name</FormLabel>
                                            <FormControl>
                                                <Input type="text"  {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="industry"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className="text-[0.65rem]  uppercase font-semibold">Industry</FormLabel>

                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="rounded-sm" >
                                                        <SelectValue placeholder="Select your industry" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Industries.map((industry, index) => (
                                                        <SelectItem key={index} value={industry}>
                                                            {industry}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[0.65rem] uppercase font-semibold">Phone</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[0.65rem] uppercase font-semibold">Website</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>

                                        </FormItem>
                                    )}
                                >
                                </FormField>
                            </fieldset>

                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[0.65rem] uppercase font-semibold">Address</FormLabel>
                                            <FormControl>
                                                <Input type="text"  {...field} />
                                            </FormControl>

                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <fieldset className={"grid grid-cols-8 gap-4"}>
                                <div className="col-span-3">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[0.65rem] uppercase font-semibold">City</FormLabel>
                                                <FormControl>
                                                    <Input type="text" {...field} />
                                                </FormControl>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <FormField
                                        control={form.control}
                                        name="state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[0.65rem] uppercase font-semibold">State</FormLabel>
                                                <FormControl>
                                                    <Input type="text"  {...field} />
                                                </FormControl>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel className="text-[0.65rem] uppercase font-semibold">Postal Code</FormLabel>
                                                <FormControl>
                                                    <Input type="text"  {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </fieldset>

                        </form>
                    </Form>
                </div>
            )
            }
            <div className="flex justify-end gap-2">
                <Button variant={"foreground"} size={"sm"} onClick={() => remove()} className="rounded-xs">Clear</Button>

                <Button
                    variant={"foreground"}
                    size={"sm"}
                    onClick={form.handleSubmit(submit)}
                    className={cn(" children:hidden rounded-xs cursor-pointer  bg-red-500 text-white", {
                        "children:inline-flex": loading
                    })}
                    disabled={!form.formState.isValid}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Continue
                </Button>

            </div>
        </div >
    );
}
