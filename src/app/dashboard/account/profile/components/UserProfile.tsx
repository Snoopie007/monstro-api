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
import { tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Staff, Vendor } from "@/types";
import { toast } from "react-toastify";


interface UserProfileProps {
    user: Vendor | Staff;
    isVendor: boolean;
}


export function UserProfile({ user, isVendor }: UserProfileProps) {

    const form = useForm({
        defaultValues: {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
        },
    });
    async function handleSubmit(v: any) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/account/settings/${user.id}/profile`, {
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

                    <fieldset className="space-y-4">
                        <div className="space-y-1">
                            <div className="text-lg font-bold">Full Name</div>
                            <p className="text-sm text-muted-foreground">
                                Update your full name.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">

                                        <FormControl>
                                            <Input type="text" placeholder="First Name" {...field} />
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

                                        <FormControl>
                                            <Input type="text" placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
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
                    size="sm"
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
