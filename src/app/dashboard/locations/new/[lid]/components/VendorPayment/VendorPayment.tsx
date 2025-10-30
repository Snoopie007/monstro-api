import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/client/stripe';
import PaymentDetails from './PaymentDetails';
import { useSession } from 'next-auth/react';
import ExistingVendorPayment from './ExistingPayment';
import NewVendorPayment from './NewPayment';


export function VendorPayment({ lid }: { lid: string }) {

    const { data: session } = useSession();

    return (
        <div className='flex flex-col gap-2'>
            <PaymentDetails />

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
                {session?.user.stripeCustomerId ? (

                    <ExistingVendorPayment lid={lid} />
                ) : (
                    <NewVendorPayment lid={lid} />
                )}

            </Elements>
        </div>
    )
}

