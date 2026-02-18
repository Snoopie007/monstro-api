'use client'
import { Button } from "@/components/ui";
import {
    Form,
    FormField,
    FormControl,
    FormItem,
    FormMessage,
    Input,
} from "@/components/forms";
import { tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Staff } from "@subtrees/types";
import { toast } from "react-toastify";


interface StaffProfileProps {
    staff: Staff;
    lid: string;
}


export function StaffProfile({ staff, lid }: StaffProfileProps) {

    const form = useForm({
        defaultValues: {
            firstName: staff.firstName || "",
            lastName: staff.lastName || "",
        },
    });
    async function handleSubmit(v: any) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/staffs/${staff.id}`, {
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
        <div className="bg-foreground/5 rounded-lg p-6 space-y-4">

            <Form {...form}>
                <form className="space-y-4 ">

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
            <div className="flex justify-end">
                <Button
                    type="submit"

                    variant={"foreground"}
                    disabled={form.formState.isSubmitting || !form.formState.isValid}
                    onClick={form.handleSubmit(handleSubmit)}
                >
                    {form.formState.isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : "Update"}
                </Button>
            </div>
        </div >
    );
}
