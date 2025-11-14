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
    FormMessage,

} from "@/components/forms";
import { useEffect, useState } from "react";
import { VendorInviteSchema } from "@/libs/FormSchemas/schemas";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { signIn } from "@/hooks/useSession";
import { Sale } from "@/types/admin";
import { TermsAndConditions } from "@/components/terms";
import { MonstroLegal } from "@/libs/server/MDXParse";

interface InviteFormProps {
    sale: Sale;
    tos: MonstroLegal | undefined;
}

const InputStyle = "bg-white border border-gray-200 rounded-lg h-12 text-base"

export function InviteForm({ sale, tos }: InviteFormProps) {


    const [errors, setErrors] = useState<FieldErrors<z.infer<typeof VendorInviteSchema>> | null>(null);
    const [checked, setChecked] = useState<boolean>(true);
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

        if (!form.getValues('password')) return;

        const { result, error } = await tryCatch(
            fetch(`/api/auth/invite`, {
                method: "POST",
                body: JSON.stringify({ ...v, saleId: sale.id, agreeToTerms: checked })
            })
        )
        await sleep(1000);



        if (error || !result || !result.ok) {

            const data = await result?.json();
            toast.error(data?.error || "Uh oh, something went wrong")
            return;
        }

        const signInResult = await signIn("credentials", { redirect: false, ...v, skipVerification: true })
        if (signInResult?.error) {
            toast.error(signInResult.code || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }
        router.push(`/dashboard/locations/new?sid=${sale.id}`);
        return
    }

    return (
        <div className={"space-y-4"}>

            <Form {...form}>
                <form >
                    <div className="space-y-3">

                        <div className="space-y-1">
                            <div className="text-xl font-bold">
                                Create your account
                            </div>
                            <p className="text-gray-500">
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
                                        <Input
                                            type="email"
                                            className={InputStyle}
                                            disabled
                                            placeholder="Email" {...field}
                                        />
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
                                        <Input type="password" placeholder="••••••••" className={InputStyle} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </fieldset>
                        <TermsAndConditions checked={checked} tos={tos} setChecked={setChecked} className="border-gray-200" />

                        <Button
                            size="lg"
                            variant={"primary"}
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={form.formState.isSubmitting || !checked}
                        >
                            {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                        </Button>
                    </div>
                </form>
            </Form>

        </div>
    )
}