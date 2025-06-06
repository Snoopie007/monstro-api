import { Skeleton } from "@/components/ui";
import { formatAmountForDisplay } from "@/libs/utils";
import { addDays, addMonths, format } from "date-fns";
import { useMemo } from "react";

export default function PaymentDetails({ userSelection }: { userSelection: any }) {
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
        <div className="bg-foreground/5 border border-foreground/10 rounded-sm p-4">
            <div className='grid grid-cols-6 gap-2'>
                <div className='col-span-3 grid grid-cols-2   text-foreground'>
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
                <div className="flex flex-col gap-2 text-xs col-span-3 text-foreground">


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