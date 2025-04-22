import { Elements } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/ui';
import { getStripe } from '@/libs/client/stripe';
import { useEffect, useMemo, useState } from 'react';
import { formatAmountForDisplay } from '@/libs/utils';
import { useNewLocation } from '../../provider/NewLocationContext';
import { MonstroPlan, MonstroPackage, PackagePaymentPlan } from '@/types/admin';
import VendorPaymentForm from './VendorPaymentForm';
import { addDays, addMonths, format } from 'date-fns';



type UserSelection = {
    plan: MonstroPlan | undefined;
    pkg: MonstroPackage | undefined;
    paymentPlan: PackagePaymentPlan | undefined;
}

export default function VendorPayment() {
    const { locationState, plans, packages } = useNewLocation();
    const [userSelection, setUserSelection] = useState<UserSelection>({ plan: undefined, pkg: undefined, paymentPlan: undefined });

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
    const today = new Date();

    if (!userSelection.plan && !userSelection.pkg && !userSelection.paymentPlan) return (
        <Skeleton className="w-full h-20" />
    );
    function dueToday() {
        const amount = userSelection.paymentPlan
            ? (userSelection.paymentPlan.downPayment || userSelection.paymentPlan.monthlyPayment) + 10
            : (userSelection.plan?.price || 0) + 10;
        return formatAmountForDisplay(amount, 'USD');
    }

    const termsStart = useMemo(() => {
        if (!userSelection.paymentPlan) return '';
        const start = addDays(today, userSelection.paymentPlan?.trial!);
        return format(start, 'MMM d, yyyy');
    }, [userSelection.paymentPlan]);

    const recurringStart = useMemo(() => {
        if (!userSelection.paymentPlan) return '';
        const start = addDays(termsStart, userSelection.paymentPlan?.trial!);
        const recurring = addMonths(start, userSelection.paymentPlan?.length!);
        return format(recurring, 'MMM d, yyyy');
    }, [userSelection.paymentPlan]);

    return (
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs">
            <div className='grid grid-cols-6 gap-2'>
                <div className='col-span-3 grid grid-cols-2  '>
                    <div className='space-y-0 flex flex-col'>
                        <span className='text-[0.65rem] uppercase  text-muted-foreground'>{userSelection.pkg ? "Package" : "Plan"}</span>
                        <span className='text-sm font-bold '>
                            {userSelection.pkg ? `${userSelection.pkg.name}` : userSelection.plan?.name}
                        </span>
                    </div>
                    {userSelection.pkg && (

                        <>
                            <div className='space-y-0 flex flex-col '>
                                <span className='text-[0.65rem] uppercase text-muted-foreground'>Payment Plan</span>
                                <span className='text-sm font-bold '>
                                    {userSelection.paymentPlan?.name}
                                </span>
                            </div>
                            <div className='space-y-0 flex flex-col '>
                                <span className='text-[0.65rem] uppercase text-muted-foreground'>Terms Starts on</span>
                                <span className='text-sm font-bold '>
                                    {termsStart}
                                </span>
                            </div>
                            <div className='space-y-0 flex flex-col '>
                                <span className='text-[0.65rem] uppercase text-muted-foreground'>Number of Terms</span>
                                <span className='text-sm font-bold '>
                                    {userSelection.paymentPlan?.length} {userSelection.paymentPlan?.interval}
                                </span>
                            </div>
                            <div className='space-y-0 flex flex-col '>
                                <span className='text-[0.65rem] uppercase text-muted-foreground'>Recurring Starts on</span>
                                <span className='text-sm font-bold '>
                                    {recurringStart}
                                </span>
                            </div>
                        </>

                    )}


                </div>
                <div className="flex flex-col gap-2 text-xs col-span-3">


                    {!userSelection.pkg && userSelection.plan
                        && (
                            <div className="flex justify-between">
                                <span >Recurring Payment</span>
                                <span>{formatAmountForDisplay(userSelection.plan?.price!, 'USD')}
                                    {userSelection.plan.id === 1 ? '' : `/${userSelection.plan.threshold} ${userSelection.plan.interval}`}
                                </span>
                            </div>
                        )}
                    {userSelection.pkg && (
                        <>

                            <div className="flex justify-between">
                                <span >Down Payment</span>
                                <span>{formatAmountForDisplay(userSelection.paymentPlan?.downPayment!, 'USD')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span >Term Payments</span>
                                <span>{formatAmountForDisplay(userSelection.paymentPlan?.monthlyPayment!, 'USD')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span >Recurring Plan</span>
                                <span>{formatAmountForDisplay(99, 'USD')}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between">
                        <span>Wallet Balance</span>
                        <span>{formatAmountForDisplay(10, 'USD')}</span>
                    </div>
                    <hr className="my-2 border-dashed border-gray-300" />
                    <div className="flex justify-between font-bold text-sm">
                        <span>Due Today</span>
                        <span>{dueToday()}</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
