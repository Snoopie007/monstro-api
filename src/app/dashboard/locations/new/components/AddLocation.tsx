"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { LocationSetupSchema } from "@/libs/FormSchemas/schemas";
import { AutoComplete } from "./GoogleAutoComplete";
import {
    Form,
    FormItem,
    FormMessage,
    FormField,
    Input,
    FormControl,
    FormLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/forms";

import { useSession } from "next-auth/react";

import { toast } from "react-toastify";
import { Industries } from "@/libs/data";
import { useRouter } from "next/navigation";


export function AddLocation({ saleId }: { saleId: string | null }) {

    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [edit, setEdit] = useState<boolean>(false);
    const { data: session, update } = useSession();

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

        form.reset({
            name: rest.name,
            industry: rest.industry,
            phone: rest.phone,
            website: rest.website,
            address: rest.address,
            city: rest.city,
            state: rest.state,
            postalCode: rest.postalCode,
            logoUrl: rest.logoUrl,
            country: rest.country,
        });

        setMetadata(metadata);
        setEdit(true);
    }


    async function submit(v: z.infer<typeof LocationSetupSchema>) {

        const isValid = await form.trigger();

        if (!isValid) return;
        setLoading(true);
        await sleep(2000);

        const path = saleId ? `/api/protected/vendor/${saleId}` : "/api/protected/vendor/locations";

        const { result, error } = await tryCatch(
            fetch(path, {
                method: "POST",
                body: JSON.stringify({
                    ...(saleId ? { saleId } : {}),
                    vendorId: session?.user?.vendorId,
                    ...v,
                    metadata,
                }),
            })
        );

        await sleep(2000);

        if (!result || error || !result.ok) {
            setLoading(false);
            return toast.error("Failed to add location, please try again.");
        }
        const data = await result.json();

        update({
            locations: [...session?.user.locations, data],
        })

        const url = saleId ? `/dashboard/location/${data.id}` : `/dashboard/locations/new/${data.id}`;

        router.push(url);

        return
    }

    function remove() {
        form.reset({});
        setEdit(false);
    }


    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <AutoComplete onSelectChange={selectAddress} />
                <div className="text-sm text-black flex items-center gap-1">
                    Cannot find your business on Google?

                    <span className="inline-block text-indigo-600 underline cursor-pointer" onClick={() => setEdit(true)}>
                        Manually add one.

                    </span>
                </div>
            </div>
            {edit && (
                <div className="bg-white border border-gray-200 shadow-xs text-black p-4 pb-8 space-y-2 rounded-sm">
                    <p className="text-sm font-medium border-b border-gray-100  pb-2">Double check your information.</p>
                    <ul className="space-y-2 list-disc list-inside ">

                        {form.formState.errors && Object.keys(form.formState.errors).map((key) => (
                            <li key={key} className=" text-red-500 text-xs">
                                {form.formState.errors[key as keyof z.infer<typeof LocationSetupSchema>]?.message}

                            </li>
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
                                                <Input type="text" className="bg-white border border-gray-200 rounded-sm" {...field} />
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
                                                    <SelectTrigger className="rounded-sm bg-white border border-gray-200 cursor-pointer" >
                                                        <SelectValue placeholder="Select your industry" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white border border-gray-200 text-black">
                                                    {Industries.map((industry, index) => (
                                                        <SelectItem key={index} value={industry} className="cursor-pointer">
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
                                                <Input type="text" className="bg-white border border-gray-200 rounded-sm" {...field} />
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
                                                <Input type="text" className="bg-white border border-gray-200 rounded-sm" {...field} />
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
                                                <Input type="text" className="bg-white border border-gray-200 rounded-sm"  {...field} />
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
                                                    <Input type="text" className="bg-white border border-gray-200 rounded-sm" {...field} />
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
                                                    <Input type="text" className="bg-white border border-gray-200 rounded-sm" {...field} />
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
                                                    <Input type="text" className="bg-white border border-gray-200 rounded-sm"  {...field} />
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
                <Button variant={"clear"} size={"sm"} onClick={() => remove()} className="">Clear</Button>

                <Button
                    variant={"continue"}
                    size={"sm"}
                    onClick={form.handleSubmit(submit)}
                    className={cn(" children:hidden ", {
                        "children:inline-flex": loading
                    })}
                    disabled={loading || form.formState.isSubmitting}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Continue
                </Button>

            </div>
        </div >
    );
}
