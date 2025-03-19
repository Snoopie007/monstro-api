import { Elements } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/ui';
import { getStripe } from '@/libs/client/stripe';
import { useEffect, useState } from 'react';
import { formatAmountForDisplay } from '@/libs/utils';
import { useOnboarding } from '../../provider/OnboardingProvider';
import { MonstroPlan, MonstroPackage, PackagePaymentPlan } from '@/types';
import VendorPaymentForm from './VendorPaymentForm';
import { plans, packages } from "@/libs/data";



type UserSelection = {
    plan: MonstroPlan | undefined;
    pkg: MonstroPackage | undefined;
    paymentPlan: PackagePaymentPlan | undefined;
}

export default function VendorPayment() {
    const { locationState } = useOnboarding();
    const [userSelection, setUserSelection] = useState<UserSelection>({ plan: undefined, pkg: undefined, paymentPlan: undefined });

    useEffect(() => {
        if (locationState.planId) {
            const plan = plans.find(p => p.id === locationState.planId);
            setUserSelection({ ...userSelection, plan });
        }
        if (locationState.pkgId) {
            const pkg = packages.find(p => p.id === locationState.pkgId);
            const paymentPlan = pkg?.paymentPlans.find(pp => pp.id === locationState.paymentPlanId);
            if (pkg && paymentPlan) {
                setUserSelection({ ...userSelection, pkg, paymentPlan });
            }
        }
    }, [locationState])
    return (
        <div className='flex flex-col gap-2'>
            <VendorPaymentDetails userSelection={userSelection} />

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


function VendorPaymentDetails({ userSelection }: { userSelection: UserSelection }) {
    if (!userSelection.plan && !userSelection.pkg && !userSelection.paymentPlan) return (
        <Skeleton className="w-full h-20" />
    );
    function dueToday() {
        const amount = userSelection.paymentPlan
            ? (userSelection.paymentPlan.downPayment || userSelection.paymentPlan.monthlyPayment) + 10
            : (userSelection.plan?.price || 0) + 10;
        return formatAmountForDisplay(amount, 'USD');
    }

    return (
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs">
            <div className="flex flex-col gap-2 text-xs">

                <div className="flex justify-between">
                    <span >{userSelection.pkg ? "Package" : "Plan"}</span>
                    <span>{userSelection.pkg ? `${userSelection.pkg.name} (${userSelection.paymentPlan?.name})` : userSelection.plan?.name}</span>
                </div>
                {userSelection.plan && (
                    <div className="flex justify-between">
                        <span >Recurring Payment</span>
                        <span>{formatAmountForDisplay(userSelection.plan?.price!, 'USD')}/{userSelection.plan.interval}</span>
                    </div>
                )}
                {userSelection.pkg && (
                    <>

                        <div className="flex justify-between">
                            <span >Down Payment</span>

                            <span>{formatAmountForDisplay(userSelection.paymentPlan?.downPayment!, 'USD')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span >Term Payments ({userSelection.paymentPlan?.length} {userSelection.paymentPlan?.interval})</span>
                            <span>{formatAmountForDisplay(userSelection.paymentPlan?.monthlyPayment!, 'USD')}</span>
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
