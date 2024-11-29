import {
    Collapsible,
    CollapsibleContent,

} from '@/components/ui'
import { FormField, FormItem, FormLabel, FormMessage, FormControl, Input } from '@/components/forms'
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { CreateMemberSchema } from '../schema';
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { StripeCardOptions } from '@/libs/utils';
import { useTheme } from 'next-themes';
interface NewMemberPaymentFormProps {
    form: UseFormReturn<z.infer<typeof CreateMemberSchema>>;
}

export default function NewMemberPaymentForm({ form }: NewMemberPaymentFormProps) {
    const [open, setOpen] = useState<boolean>(false);
    const paymentMethod = form.watch('paymentMethod')
    const { theme } = useTheme();
    const stripe = useStripe();
    const elements = useElements();

    useEffect(() => {
        if (paymentMethod) {
            setOpen(paymentMethod === 'card')
        }
    }, [paymentMethod])

    async function handleCardChange(event: any) {
        console.log(event)
        console.log(form)
        if (event.complete) {
            if (!elements || !stripe) return;

            const tokenRef = await stripe.createToken(elements.getElement(CardElement)!);
            console.log(tokenRef)
            if (tokenRef.token) {
                form.setValue('billing.stripeToken', tokenRef.token.id)
            }
        }
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen} >
            <CollapsibleContent className='bg-foreground/5 p-4 rounded-sm mt-4 space-y-2'>
                <fieldset>
                    <FormField
                        control={form.control}
                        name="billing.cardHolderName"
                        render={({ field }) => (
                            <FormItem>

                                <FormLabel>Card Holder Name</FormLabel>
                                <FormControl>
                                    <Input type='text' placeholder="Card Holder Name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset >
                    <FormItem className="flex-1">
                        <FormLabel className="font-semibold">
                            Card Info
                        </FormLabel>
                        <CardElement
                            className=" bg-background  rounded-sm  p-3 w-full"
                            options={{
                                ...StripeCardOptions,
                                style: {
                                    base: {
                                        color: theme === "dark" ? "#fff" : "#000",
                                        iconColor: theme === "dark" ? "#fff" : "#000",
                                    }
                                }
                            }}


                            onChange={handleCardChange}
                        />
                        <FormMessage />

                    </FormItem>
                </fieldset>
            </CollapsibleContent>
        </Collapsible>
    )
}
