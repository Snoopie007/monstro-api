"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { LocationSetupSchema } from "@/libs/FormSchemas/schemas";
import { AutoComplete } from ".";
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
import { GoogleMapProvider } from "../providers";

const InputStyle = "bg-foreground/5 h-12 text-base px-4 py-2 rounded-lg border border-foreground/10 ";

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
            slug: "",
        },
        mode: "onChange",
    });

    function selectAddress(place: google.maps.places.Place | undefined) {
        if (!place) return;

        const address: Record<string, string> = {};

        const addressMapping: Record<string, { field: string, useShort?: boolean }> = {
            'locality': { field: 'city' },
            'administrative_area_level_1': { field: 'state', useShort: true },
            'postal_code': { field: 'postalCode' },
            'country': { field: 'country', useShort: true }
        };

        place.addressComponents?.forEach(component => {
            const type = component.types[0];

            // Handle street address components
            if (type === 'street_number') {
                address.streetNumber = component.longText || '';
            } else if (type === 'route') {
                address.route = component.longText || '';
            }

            const mapping = addressMapping[type];
            if (mapping) {
                const value = mapping.useShort ? component.shortText : component.longText;
                address[mapping.field] = value || '';
            }
        });

        const { displayName, internationalPhoneNumber, websiteURI } = place;



        form.reset({
            name: displayName || "",
            industry: "",
            phone: internationalPhoneNumber?.toString().replaceAll(/[ ()-]/g, '') || "",
            website: websiteURI?.toString().replace(/^(https?:\/\/[^\/]+).*$/, '$1') || "",
            address: `${address.streetNumber} ${address.route}`,
            city: address.city || "",
            state: address.state || "",
            postalCode: address.postalCode || "",
            country: address.country || "USA",
            slug: `${displayName?.toLowerCase().replace(/ /g, '')}`
        });
        const metadata = {
            placeId: place.id,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            lat: place.location?.lat(),
            lng: place.location?.lng(),
        }

        setMetadata(metadata);
        setEdit(true);
    }


    async function submit(v: z.infer<typeof LocationSetupSchema>) {

        const isValid = await form.trigger();

        if (!isValid) return;
        setLoading(true);
        await sleep(2000);

        const path = saleId ? `/api/protected/account/sales/${saleId}` : "/api/protected/account/locs";

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
            const error = await result?.json();
            console.log(error)
            return toast.error(error?.error || "Failed to add location, please try again.");
        }
        const data = await result.json();

        await update({
            locations: [...session?.user.locations, data],
        })

        const url = saleId ? `/dashboard/location/${data.id}` : `/dashboard/locations/new/${data.id}`;
        return router.push(url);

    }

    function remove() {
        form.reset({});
        setEdit(false);
    }


    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <GoogleMapProvider>
                    <AutoComplete onSelect={selectAddress} />
                </GoogleMapProvider>
                <div className="text-sm text-foreground flex items-center gap-1 pl-0.5">
                    Cannot find your business on Google?
                    <span className="inline-block text-indigo-500 underline cursor-pointer" onClick={() => setEdit(true)}>
                        Manually add one.

                    </span>
                </div>
            </div>

            {edit && (
                <div className="pb-8 space-y-2 rounded-md">

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
                                            <FormLabel size="tiny">Business Name</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle}
                                                    placeholder="Business name" {...field} />
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
                                            <FormLabel size="tiny">Industry</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className={InputStyle} >
                                                        <SelectValue placeholder="Select your industry" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent >
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
                                                <Input type="text" className={InputStyle} placeholder="Business phone number" {...field} />
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
                                                <Input type="text" className={InputStyle} {...field} />
                                            </FormControl>

                                        </FormItem>
                                    )}
                                >
                                </FormField>
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Unique Business Handle</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle} placeholder="Unique business handle" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Address</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle} placeholder="Business address" {...field} />
                                            </FormControl>

                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <fieldset className={"grid grid-cols-8 gap-4"}>
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel size="tiny">City</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle} placeholder="City" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel size="tiny">State</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle} placeholder="State" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="postalCode"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel size="tiny">Postal Code</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={InputStyle} placeholder="Postal code" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        </form>
                    </Form>
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button variant={"clear"} onClick={() => remove()} className="">Clear</Button>

                <Button
                    variant={"continue"}

                    onClick={form.handleSubmit(submit)}

                    disabled={loading || form.formState.isSubmitting}
                >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Add Location"}
                </Button>

            </div>
        </div >
    );
}
