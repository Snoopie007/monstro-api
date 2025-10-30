
import { cn } from "@/libs/utils";
import { useNewLocation } from "../provider";
import { MonstroPlan } from "@/types/admin";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TooltipTrigger, Tooltip, TooltipContent } from "@/components/ui";
import { InfoIcon } from "./Compare";


const FeesData = [
    {
        label: "Transaction Fee",
        description: "Tranfer fees are applied only when you use our online payment processor to manage your subscriptions and product purchases.",
        values: ["2% + Stripe Fees", "2% + Stripe Fees", "Stripe Fees"]
    },
    {
        label: "Email Usage",
        description: "Email usage is charged based on the number of emails sent to your members.",
        values: ["$0.01/email", "$0.01/email", "$0.01/email"]
    },
    {
        label: "AI Token Usage",
        description: "AI usage is calculated per 1 million tokens used. On average each AI message would be around 300 to 1000 tokens.",
        values: ["~$5/1M tokens", "~$5/1M tokens", "~$5/1M tokens"]
    }
];

const AdditionalFeesPlanNames = ["Free", " Start-up", "Growth"];


export default function PlanList() {
    const { locationState, updateLocationState, plans } = useNewLocation();

    function isSelected(plan: MonstroPlan) {
        return locationState.planId === plan.id;
    }



    function handlePlanSelect(id: number) {
        updateLocationState({
            ...locationState,
            planId: id
        });
    };


    return (
        <>
            <div className="grid grid-cols-3 gap-2">
                {plans.map((plan, i) => (
                    <div key={i}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={cn("space-y-4 border border-foreground/10 p-4 rounded-lg cursor-pointer", { "border-indigo-500 border-2": isSelected(plan) })}>
                        <div className="space-y-2">
                            <div className="  font-semibold">{plan.name}</div>
                            <p className="text-muted-foreground text-sm" dangerouslySetInnerHTML={{ __html: plan.description }} />
                        </div>
                        <div className="flex flex-col">
                            <span className=" text-sm font-semibold">Price</span>
                            <span className="">${plan.price}{plan.id !== 1 && `/${plan.interval}`}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className=" border border-foreground/10 p-4 rounded-lg space-y-4 ">
                <div className="space-y-1">
                    <div className="font-semibold">Additional Fees</div>
                    <p className="text-muted-foreground text-sm">Additional fees will vary depending on your plan and usage.</p>
                </div>
                <Table className="min-w-full bg-background">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[160px] h-8"></TableHead>
                            {AdditionalFeesPlanNames.map((plan) => (
                                <TableHead key={plan} className="h-8">{plan}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {FeesData.map((row, i) => (
                            <TableRow key={row.label} className="border-b border-foreground/10">
                                <TableCell className="text-left px-0 font-semibold">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1" >
                                            {row.label}
                                            <InfoIcon className="size-4 -mt-0.5 " />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[150px] text-sm">{row.description}</TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                {FeesData[i].values.map((value, cIdx) => (
                                    <TableCell key={cIdx}>{value}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}

