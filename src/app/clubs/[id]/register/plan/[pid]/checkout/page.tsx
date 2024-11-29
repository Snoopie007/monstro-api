import React from 'react'
import { RegistrationHeader } from '../../../components/header'
import PaymentClientWrapper from './client-wrapper'
import { Plan } from '@/types';
import { auth } from '@/auth';
import { Session } from 'next-auth';

async function fetchPlan(id: string, session: Session | null): Promise<{ plan: Plan, stripeKey: string } | null> {
    if (!session) {
        return null;
    }
    const headers = {
        "Authorization": `Bearer ${session.user.token}`,
    }

    try {

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/get-plan/${id}`, { headers });
        if (!res.ok) {
            throw new Error("An error occurred while fetching the data.");
        }

        const { data: plan } = await res.json();

        if (!plan) {
            return null;
        }
        const resKey = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/fetch-vendor-stripe-pk/${plan.program_id}`, { headers });
        if (!resKey.ok) {
            throw new Error("An error occurred while fetching the data.");
        }
        const { data: stripeKey } = await resKey.json();

        return { plan, stripeKey };
    } catch (error) {
        console.log("error", error);
        return null;
    }
}


interface UserCheckoutPageProps {
    params: Promise<{

        pid: string;
    }>
}

export default async function UserCheckoutPage(props: UserCheckoutPageProps) {
    const params = await props.params;

    const {
        pid
    } = params;

    const session = await auth();
    const data = await fetchPlan(pid, session);
    if (!data) {
        return (<div>No Plans Found</div>)
    }
    const { plan, stripeKey } = data;


    return (
        <div className="flex h-screen flex-col items-center justify-start">
            <RegistrationHeader  >
                Billing & Payment Info
            </RegistrationHeader>
            <div className=" text-black  w-[500px]  px-6 pt-6 pb-10 ">

                <p className={"text-base mb-4"}>
                    Here's a summary of your plan. Please review the info below prior to proceeding with payment.
                </p>
                <div className='border border-gray-200 p-4 rounded-sm bg-gray-100/20'>
                    <div className="flex flex-col gap-2">

                        <div className="flex  justify-between">

                            <div className="text-sm font-semibold">
                                Your Plan
                            </div>
                            <div className="text-sm capitalize">
                                {plan?.name}
                            </div>
                        </div>


                    </div>

                    <div>
                        <div className="border-b my-3 border-dashed border-gray-300"></div>

                        <div className="flex font-bold justify-between">
                            <div className="text-base">Due Today</div>
                            <div className="text-base">$ {plan?.pricing.amount}</div>
                        </div>
                    </div>
                </div>

                <PaymentClientWrapper plan={plan} programId={plan ? plan.program_id : 0} stripePublishableKey={stripeKey} />
            </div>

        </div>
    )
}
