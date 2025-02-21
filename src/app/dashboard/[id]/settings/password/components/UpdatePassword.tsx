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
import { cn } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpdatePasswordSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@/libs/api";
import { toast } from "react-toastify";

export function UpdatePassword({ locationId }: { locationId: string }) {
    const form = useForm<z.infer<typeof UpdatePasswordSchema>>({
        resolver: zodResolver(UpdatePasswordSchema),
        defaultValues: {
            confirmPassword: "",
            password: "",
            currentPassword: ""
        }
    })
    async function handleSubmit(v: z.infer<typeof UpdatePasswordSchema>) {
       await updatePassword(v, locationId).then(() => {
        toast.success("Password Updated");
       }).catch((error) => {
        toast.error("Something went wrong, please try again later");
       }); 
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
                                        <FormLabel className="font-semibold">
                                            Current Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="Current Password" {...field} />
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
                                        <FormLabel className="font-semibold">
                                            New Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="Password" {...field} />
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
                                        <FormLabel className="font-semibold">
                                            Confirm Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="Confirm Password" {...field} />
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
                    className={cn("children:hidden")}
                    type="submit"
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Update
                </Button>
            </div>
        </Card >
    )
}
