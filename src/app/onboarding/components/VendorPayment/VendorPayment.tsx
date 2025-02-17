
import { Elements } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/ui';

import { getStripe } from '@/libs/stripe';
import { useEffect, useState } from 'react';
import { formatAmountForDisplay, tryCatch } from '@/libs/utils';
import { useOnboarding } from '../../provider/OnboardingProvider';


import { useSession } from 'next-auth/react';
import { MonstroPackage, MonstroPlan, PackagePaymentPlan } from '../ProgramSelection/dummy';
import VendorPaymentForm from './VendorPaymentForm';

export default function VendorPayment() {

    const { progress } = useOnboarding();
    const [loading, setLoading] = useState<boolean>(false);

    const { data: session } = useSession();



    return (
        <div className='flex flex-col gap-2'>
            <VendorPaymentDetails plan={progress.plan} pkg={progress.pkg} paymentPlan={progress.paymentPlan} />

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
                <VendorPaymentForm />
            </Elements>
        </div>
    )
}


function VendorPaymentDetails({ plan, pkg, paymentPlan }: { plan: MonstroPlan | null, pkg: MonstroPackage | null, paymentPlan: PackagePaymentPlan | null }) {
    if (!plan && !pkg && !paymentPlan) return (
        <Skeleton className="w-full h-20" />
    );
    function dueToday() {
        const amount = paymentPlan
            ? (paymentPlan.downPayment || paymentPlan.monthlyPayment) + 10
            : (plan?.price || 0) + 10;
        return formatAmountForDisplay(amount, 'USD');
    }

    return (
        <div className="bg-foreground border border-foreground/10 rounded-sm p-4">
            <div className="flex flex-col gap-2 text-xs">

                <div className="flex justify-between">
                    <span >{pkg ? "Package" : "Plan"}</span>
                    <span>{pkg ? `${pkg.name} (${paymentPlan?.name})` : plan?.name}</span>
                </div>
                {plan && (
                    <div className="flex justify-between">
                        <span >Recurring Payment</span>
                        <span>{formatAmountForDisplay(plan?.price!, 'USD')}/{plan.interval}</span>
                    </div>
                )}
                {pkg && (
                    <>

                        <div className="flex justify-between">
                            <span >Down Payment</span>

                            <span>{formatAmountForDisplay(paymentPlan?.downPayment!, 'USD')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span >Term Payments ({paymentPlan?.length} {paymentPlan?.interval})</span>
                            <span>{formatAmountForDisplay(paymentPlan?.monthlyPayment!, 'USD')}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between">
                    <span>Wallet Balance</span>
                    <span>{formatAmountForDisplay(10, 'USD')}</span>
                </div>
            </div>
            <hr className="my-2.5 border-dashed border-gray-300" />
            <div className="flex justify-between font-bold text-sm">
                <span>Due Today</span>
                <span>{dueToday()}</span>
            </div>
        </div>
    )
}
