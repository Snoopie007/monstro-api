import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    RegionSelect
} from "@/components/forms";

import { UseFormReturn } from "react-hook-form";
import { VendorBillingSchema } from "@/libs/FormSchemas/schemas";
import { z } from "zod";


const INPUT_STYLES = "bg-background text-foreground border-foreground/10"

interface BillingFieldsProps {
    form: UseFormReturn<z.infer<typeof VendorBillingSchema>>
}

export default function BillingFields({ form }: BillingFieldsProps) {
    return (
        <>
            <fieldset >
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem >
                        <FormLabel className="text-[0.65rem] uppercase font-semibold">
                            Name on card
                        </FormLabel>
                        <FormControl>
                            <Input type="text" className={INPUT_STYLES} placeholder="Name on card" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
            </fieldset>
            <fieldset>
                <FormField control={form.control} name="address_line1" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[0.65rem] uppercase font-semibold">
                            Billing addres
                        </FormLabel>
                        <FormControl>
                            <Input type="text" className={INPUT_STYLES} placeholder="Billing address" {...field} />
                        </FormControl>

                        <FormMessage />
                    </FormItem>
                )} />

            </fieldset>
            <fieldset className="grid grid-cols-9 gap-2">
                <FormField control={form.control} name="address_state" render={({ field }) => (
                    <FormItem className="col-span-4">
                        <FormLabel className="text-[0.65rem] uppercase font-semibold">
                            State
                        </FormLabel>

                        <FormControl>
                            <RegionSelect value={field.value} onChange={field.onChange} className={INPUT_STYLES} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>

                )} />
                <FormField control={form.control} name="address_city" render={({ field }) => (
                    <FormItem className="col-span-3">
                        <FormLabel className="text-[0.65rem] uppercase font-semibold">
                            City
                        </FormLabel>

                        <FormControl>
                            <Input type="text" className={INPUT_STYLES} placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="address_zip" render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel className="text-[0.65rem] uppercase font-semibold">
                            Zip
                        </FormLabel>
                        <FormControl>
                            <Input type="text" className={INPUT_STYLES} placeholder="Zip" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </fieldset>


        </>
    )
}
