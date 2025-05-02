import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/client/stripe';
import { useEffect, useState } from 'react';
import { useNewLocation } from '../../provider/NewLocationContext';
import { MonstroPlan, MonstroPackage, PackagePaymentPlan } from '@/types/admin';
import PaymentDetails from './PaymentDetails';
import { useSession } from 'next-auth/react';
import ExistingVendorPayment from './ExistingPayment';
import NewVendorPayment from './NewPayment';


export type UserSelection = {
    plan: MonstroPlan | undefined;
    pkg: MonstroPackage | undefined;
    paymentPlan: PackagePaymentPlan | undefined;
}

export function VendorPayment({ lid }: { lid: string }) {
    const { locationState, plans, packages } = useNewLocation();
    const [userSelection, setUserSelection] = useState<UserSelection>({ plan: undefined, pkg: undefined, paymentPlan: undefined });
    const { data: session } = useSession();

    useEffect(() => {
        if (locationState.planId) {
            const plan = plans.find(p => p.id === locationState.planId);
            setUserSelection({ ...userSelection, plan });
        }
        if (locationState.pkgId) {
            const pkg = packages.find(p => p.id === locationState.pkgId);
            const paymentPlan = pkg?.paymentPlans?.find(pp => pp.id === locationState.paymentPlanId);
            if (pkg && paymentPlan) {
                setUserSelection({ ...userSelection, pkg, paymentPlan });
            }
        }
    }, [locationState])

    return (
        <div className='flex flex-col gap-2'>
            <PaymentDetails userSelection={userSelection} />

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

