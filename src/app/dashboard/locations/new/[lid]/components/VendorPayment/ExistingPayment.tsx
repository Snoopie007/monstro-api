
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNewLocation } from '../../provider/NewLocationContext';

import { useVendorPaymentMethods } from '@/hooks';
import { Stripe } from 'stripe';
import { cn, sleep, tryCatch } from '@/libs/utils';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/client/stripe';
import AddPaymentMethod from './AddMethod';
import { Loader2 } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { decodeId } from '@/libs/server/sqids';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function ExistingVendorPayment({ lid }: { lid: string }) {
    const { locationState } = useNewLocation();
    const { data: session, update } = useSession();
    const router = useRouter();
    const { methods, error, isLoading } = useVendorPaymentMethods();
    const [paymentMethod, setPaymentMethod] = useState<Stripe.PaymentMethod | null>(null);
    const [loading, setLoading] = useState(false);

    const isSelected = useCallback((id: string) => {
        if (!paymentMethod) return false;
        return paymentMethod?.id === id;
    }, [paymentMethod]);


    async function handleSubmit() {
        if (!paymentMethod) return;
        const toastRef = toast.loading("Processing payment...", { className: 'text-sm font-medium ' });
        console.log(paymentMethod)

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/vendor/locations/${lid}/existing`, {
                method: 'POST',
                body: JSON.stringify({
                    paymentMethodId: paymentMethod?.id,
                    state: locationState
                }),
            })

        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.update(toastRef, {
                render: "An error occurred while processing your payment.",
                type: "error",
                isLoading: false,
                autoClose: 100
            });
            return;
        }

        await update({
            locations: session?.user.locations.map((location: { id: string, status: string }) => {
                const decodedId = decodeId(location.id);
                return decodedId === locationState.locationId
                    ? { ...location, status: 'active' }
                    : location
            })
        });

        toast.update(toastRef, {
            render: "Payment successful",
            type: "success",
            isLoading: false,
            autoClose: 100
        });
        await sleep(100)
        return router.push(`/dashboard/location/${lid}`)
    }
    return (
        <div className='flex flex-col gap-2'>
            <div className='text-sm font-medium'>Select a payment method</div>
            <ul className="flex flex-col gap-2">
                {isLoading && (
                    <div className="flex flex-col gap-2">
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-10" />
                    </div>
                )}
                {methods && methods.map((method: Stripe.PaymentMethod, index: number) => (
                    <Fragment key={index}>
                        {method.card && (
                            <li className={cn("flex flex-row items-center bg-white",
                                "hover:bg-indigo-50 hover:text-black",
                                "justify-between gap-4 p-2 border rounded-sm cursor-pointer ",
                                { "bg-indigo-600 text-white": isSelected(method.id) }
                            )}
                                onClick={() => setPaymentMethod(method)}
                            >
                                <div className="flex flex-row items-center gap-2">
                                    <img src={`/images/cards/${method.card.brand}.svg`} alt={method.card.brand} className="h-7 w-7" />
                                    <span className="text-sm capitalize">{method.card.brand} •••• {method.card.last4}</span>
                                </div>
                                <span className="text-sm">{method.card.exp_month} / {method.card.exp_year}</span>
                            </li>
                        )}
                    </Fragment>
                ))}

            </ul>
            <Elements
                stripe={getStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)}
                options={{
                    appearance: {
                        variables: {
                            colorIcon: "#6772e5",
                            fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                        },
                    },
                }}
            >
                <AddPaymentMethod />
            </Elements>
            <div className="flex justify-end">
                <Button
                    size={"sm"}
                    className={cn("cursor-pointer", {
                        "children:inline-block": loading,
                        "children:hidden": !loading
                    })}
                    onClick={() => handleSubmit()}
                    disabled={loading}

                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Complete
                </Button>
            </div>
        </div>

    )
}

