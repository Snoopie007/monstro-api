"use client";
import { FieldErrors, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    Input,

} from "@/components/forms";
import { useEffect, useState } from "react";
import { VendorInviteSchema } from "@/libs/schemas";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sale } from "@/types/admin";
import { TermsAndConditions } from "@/components/terms";
import { MonstroLegal } from "@/libs/server/MDXParse";
interface InviteFormProps {
    sale: Sale;
    tos: MonstroLegal | undefined;
}

export function InviteForm({ sale, tos }: InviteFormProps) {

    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<FieldErrors<z.infer<typeof VendorInviteSchema>> | null>(null);
    const [checked, setChecked] = useState<boolean>(false);
    const router = useRouter();


    const form = useForm<z.infer<typeof VendorInviteSchema>>({
        resolver: zodResolver(VendorInviteSchema),
        defaultValues: {
            email: sale.email || "",
            password: '',
        },
        mode: "onChange",
    });



    useEffect(() => {
        if (form.formState.errors) {
            setErrors(form.formState.errors);
        }
    }, [form.formState.errors]);


    async function onSubmit(v: z.infer<typeof VendorInviteSchema>) {
        await form.trigger()
        if (!form.formState.isValid) return;

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/auth/invite`, {
                method: "POST",
                body: JSON.stringify({ ...v, saleId: sale.id, agreeToTerms: checked })
            })
        )
        await sleep(1000);

        setLoading(false);


        if (error || !result || !result.ok) {
            const data = await result?.json();
            toast.error(data?.error || "Uh oh, something went wrong")
            return;
        }

        const signInResult = await signIn("credentials", { redirect: false, ...v })
        if (signInResult?.error) {
            toast.error(signInResult.code || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }
        router.push(`/dashboard/locations/new?sid=${sale.id}`);
    }

    return (
        <div className={"space-y-4"}>

            <Form {...form}>
                <form >
                    <div className="space-y-2">

                        <div className="space-y-1">
                            <div className="text-base font-medium">
                                Create your account
                            </div>
                            <p className="text-sm text-gray-500">
                                Welcome to Monstro! Please set your password to complete your account setup.
                            </p>
                        </div>
                        <fieldset>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel size="tiny">
                                        Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="email" className="bg-white border border-gray-200  rounded-sm p-4 text-sm shadow-none" disabled placeholder="Email" {...field} />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </fieldset>

                        <fieldset>
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel size="tiny">
                                        Setup Your Password
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" className="bg-white border border-gray-200  rounded-sm p-4 text-sm shadow-none [&:not(:placeholder-shown)]:text-lg" {...field} />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </fieldset>
                        <TermsAndConditions checked={checked} tos={tos} setChecked={setChecked} />

                        <div className={"grid grid-cols-2 gap-2"}>

                            <Button
                                type="button"
                                className={cn(
                                    "col-span-2 children:hidden w-full bg-indigo-600 text-white cursor-pointer ",

                                    { "children:inline-block": loading })
                                }
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={loading || !checked}
                            >
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Continue
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>

        </div>
    )
}