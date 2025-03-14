'use client'
import { Button, Card } from "@/components/ui";
import {
    Form,
    FormField,
    FormLabel,
    FormControl,
    FormItem,
    FormMessage,
    Input, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Select } from "@radix-ui/react-select";
import { useMemo, useState } from "react";
import { CountryCode, Member, Vendor } from "@/types";
import UserAvatar from "./UserAvatar";
import { CountryCodes } from "@/libs/data";
import { toast } from "react-toastify";

export function UserProfile({ user, locationId }: { user: Vendor; locationId: string }) {

    const form = useForm({
        defaultValues: {
            id: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || ""
        },
    });

    async function handleSubmit(v: any) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/profile/`, {
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
        <Card className="rounded-sm">
            <div className="border-b px-4 py-3">
                <span>General Information</span>
            </div>
            <div className="px-6 py-8">
                <Form {...form}>
                    <form id="profile" onSubmit={form.handleSubmit(handleSubmit)}>
                        <input type="hidden" name="id" value={form.getValues("id")} />
                        <fieldset>
                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="flex-1 mt-0">
                                            <FormLabel className="font-semibold">First Name</FormLabel>
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
                                            <FormLabel className="font-semibold">Last Name</FormLabel>
                                            <FormControl>
                                                <Input type="text" className="rounded-sm" placeholder="Last Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </fieldset>
                        <div className="border-t py-3 px-6 text-right">
                            <Button
                                type="submit" 
                                variant={"foreground"}
                                size={"sm"}
                                className={cn("children:hidden")}
                            >
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Update
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </Card>
    );
}
