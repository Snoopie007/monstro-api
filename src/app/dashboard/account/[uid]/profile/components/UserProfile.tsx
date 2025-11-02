'use client'
import { Button } from "@/components/ui";
import {
    Form,
    FormField,
    FormLabel,
    FormControl,
    FormItem,
    FormMessage,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { CountryCode, Staff, Vendor } from "@/types";
import { toast } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserInfoSchema } from "@/libs/FormSchemas";
import { useState } from "react";
import { CountryCodes } from "@/libs/data";
import PhoneInput from "react-phone-number-input/input";
interface UserProfileProps {
    user: Vendor | Staff;
    isVendor: boolean;
}


export function UserProfile({ user, isVendor }: UserProfileProps) {
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const form = useForm({
        resolver: zodResolver(UserInfoSchema),
        defaultValues: {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
        },
    });

    async function handleSubmit(v: any) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/account/${user.id}/info`, {
                method: "PUT",
                body: JSON.stringify(v),
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong.");
            return;
        }
        toast.success("Profile updated successfully!");
    }

    return (
        <div className="bg-foreground/5 rounded-lg">

            <Form {...form}>
                <form className="space-y-4 p-6">

                    <fieldset>
                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">First Name</FormLabel>
                                        <FormControl>
                                            <Input type="text" className="rounded-sm" placeholder="First Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">Last Name</FormLabel>
                                        <FormControl>
                                            <Input type="text" placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="flex-1 mt-0">
                                    <FormLabel size="tiny">Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <FormLabel size="tiny">Phone</FormLabel>
                        <div className="flex flex-row gap-1">
                            <Select
                                onValueChange={(value: string) => {
                                    setPhoneRegion(value as CountryCode);
                                }}
                                defaultValue={phoneRegion}
                            >
                                <SelectTrigger
                                    className={"w-[22%]"}
                                >
                                    <SelectValue defaultValue={"US"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {CountryCodes.map((country, index) => (
                                        <SelectItem
                                            key={index}
                                            value={country.code}
                                        >
                                            {country.shortName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({
                                    field: { onChange, value, ...rest },
                                }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <PhoneInput
                                                type="tel"
                                                className={cn(

                                                    "inline-block w-full bg-background  h-12 rounded-lg  border-foreground/10  border   px-4"
                                                )}
                                                value={value}
                                                withCountryCallingCode={true}
                                                international={true}
                                                country={phoneRegion}
                                                onChange={onChange}
                                                {...rest}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                </form>
            </Form>
            <div className="bg-foreground/5 py-3 px-6 flex justify-end">
                <Button
                    type="submit"
                    variant={"foreground"}
                    disabled={form.formState.isSubmitting || !form.formState.isValid}
                    onClick={form.handleSubmit(handleSubmit)}
                >
                    {form.formState.isSubmitting ? <Loader2 className=" h-4 w-4 animate-spin" /> : "Update"}
                </Button>
            </div>
        </div >
    );
}
