import { Skeleton } from "@/components/ui";
import { formatAmountForDisplay } from "@/libs/utils";
import { addDays, addMonths, format } from "date-fns";
import { useMemo } from "react";
import { useNewLocation } from "../../provider/NewLocationContext";

export default function PaymentDetails() {
    const { locationState, plans } = useNewLocation();

    const selectedPlan = plans?.find(p => p.id === locationState.planId);
    function dueToday() {
        const amount = selectedPlan?.price || 0;
        return formatAmountForDisplay(amount, 'USD');
    }




    return (
        <div className=" border border-foreground/10 rounded-lg p-4 space-y-2.5">

            {selectedPlan && (
                <div className="flex justify-between">
                    <span >Recurring Payment</span>
                    <span>{formatAmountForDisplay(selectedPlan?.price!, 'USD')}
                        {selectedPlan.id === 1 ? '' : `/${selectedPlan.interval}`}
                    </span>
                </div>
            )}

            <div className="flex justify-between">
                <span>Wallet Balance</span>
                <span>$0</span>
            </div>
            <hr className="my-2 border-dashed border-foreground/10" />
            <div className="flex justify-between font-semibold ">
                <span>Due Today</span>
                <span>{dueToday()}</span>
            </div>
        </div>
    )
}