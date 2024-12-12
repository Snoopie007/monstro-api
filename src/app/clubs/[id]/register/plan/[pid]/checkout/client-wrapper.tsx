'use client'
import { getStripe } from "@/libs/stripe";
import { Elements } from "@stripe/react-stripe-js";
import PlanBuilderPayment from "./payment-form";

export default function PaymentClientWrapper({
    plan,
    programId,
    stripePublishableKey,
    locationId
}: {
    plan: any
    programId: number,
    stripePublishableKey: string,
    locationId: string
}) {
    return (

        <div className="mt-4">
            {stripePublishableKey && (
                <Elements
                    stripe={getStripe(stripePublishableKey)}
                    options={{
                        appearance: {
                            variables: {
                                colorIcon: "#6772e5",
                                fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                            },
                        },
                    }}
                >
                    <PlanBuilderPayment plan={plan} programId={programId} locationId={locationId} />
                </Elements>
            )}
        </div>
    )
}
