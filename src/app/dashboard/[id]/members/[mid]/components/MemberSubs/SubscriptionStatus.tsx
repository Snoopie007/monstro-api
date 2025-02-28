import { MemberSubscription } from "@/types/member";
import { Clock4Icon } from "lucide-react";
import { Badge } from "@/components/ui";
import { format } from "date-fns";


export function SubscriptionStatus({ sub }: { sub: MemberSubscription }) {

    const status = sub.status.replace('_', ' ');

    if (sub.trialEnd && sub.status === 'trialing') {
        return (
            <Badge sub={sub.status} size={"tiny"} className="flex flex-row items-center gap-1">
                `Trial ends ${format(sub.trialEnd, "MMM d, yyyy")}`
            </Badge>
        )
    }

    return (
        <div className='flex flex-row items-center gap-2'>
            <Badge sub={sub.status} size={"tiny"}>{status}</Badge>
            {sub.cancelAt && sub.cancelAtPeriodEnd && (
                <Badge sub={sub.status} size={"tiny"} className="flex flex-row items-center gap-1">
                    Cancels {format(sub.cancelAt, "MMM d, yyyy")}
                    <Clock4Icon size={14} />
                </Badge>
            )}
        </div>
    )


}


