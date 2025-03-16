'use client'
import { Button, Card, } from "@/components/ui";
import {
    Form,
    FormField,
    FormLabel,
    FormControl,
    FormItem,
    FormMessage,
    Input,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpdatePasswordSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useState } from "react";

export function UpdatePassword({ locationId }: { locationId: string }) {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof UpdatePasswordSchema>>({
        resolver: zodResolver(UpdatePasswordSchema),
        defaultValues: {
            confirmPassword: "",
            password: "",
            currentPassword: ""
        }
    })
    async function handleSubmit(v: z.infer<typeof UpdatePasswordSchema>) {

        if (v.currentPassword === v.password) {
            toast.error("Please a different password for your new password.")
            return
        }

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/profile/password`, {
                method: "PUT",
                body: JSON.stringify(v)
            })
        )

        setLoading(false)
        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again.")
        }

        if (result?.ok) {
            toast.success("Password updated successfully.")
        }

    }
    return (
        <Card className='rounded-sm'>
            <div className='border-b  px-4 py-3'>
                <span>Update Password</span>
            </div>
            <div className="px-6 py-8 ">
                <Form {...form}>
                    <form id="update-password">
                        <fieldset>
                            <div className="flex gap-4">
                                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            Current Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                        </fieldset>
                        <fieldset>
                            <div className="flex gap-4">
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            New Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                        </fieldset>
                        <fieldset>
                            <div className="flex gap-4">
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            Confirm Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
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
            <div className="border-t py-3 px-6  text-right">
                <Button
                    onClick={form.handleSubmit(handleSubmit)}
                    variant={"foreground"}
                    size={"sm"}
                    className={cn("children:hidden", loading && "children:inline-block")}
                    type="submit"
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Update
                </Button>
            </div>
        </Card >
    )
}
