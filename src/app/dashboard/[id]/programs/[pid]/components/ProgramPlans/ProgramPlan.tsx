import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Button
} from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useMemo, useState } from "react";
import UpsertPlan from "./UpsertPlan";
import { formatAmountForDisplay } from "@/libs/utils";
import { MemberPlan } from "@/types";
import { Input } from "@/components/forms/input";


interface ProgramPlansProps {
    programPlans: any[];
    programId: number
    vendorId: number,
    locationId: string
}

export default function ProgramPlans({ programPlans, programId, vendorId, locationId }: ProgramPlansProps) {
    const [currentPlan, setCurrentPlan] = useState<MemberPlan | null>(null);

    const editPlanOptions = useMemo(() => {
        return {
            currentPlan,
            onChange(plan: MemberPlan | null) {
                setCurrentPlan(plan);
            },
        };
    }, [currentPlan]);

    async function create(plan: MemberPlan | null) {
        if (plan && plan.id) {
            setCurrentPlan({
                id: plan.id,
                name: plan.name,
                description: plan.description,
                family: plan.family,
                programId: plan.programId,
                familyMemberLimit: plan.familyMemberLimit,
                contractId: plan.contractId,
                price: plan.price,
                currency: plan.currency ?? "usd",
                stripePriceId: plan.stripePriceId,
                type: plan.type,
                contract: plan.contract,
                totalClassLimit: plan.totalClassLimit,
                allowProration: plan.allowProration,
                billingAnchorConfig: plan.billingAnchorConfig,
                expireDate: plan.expireDate,
                interval: plan.interval,
                intervalClassLimit: plan.intervalClassLimit,
                intervalThreshold: plan.intervalThreshold,
                created: plan.created,
                updated: plan.updated,
                deleted: null,
            });
        } else {
            setCurrentPlan({
                name: '',
                description: '',
                family: false,
                programId: programId,
                familyMemberLimit: 0,
                price: 0,
                currency: 'usd',
                interval: null,
                type: "recurring",
                totalClassLimit: 0,
                allowProration: false,
                expireDate: new Date(),
                billingAnchorConfig: null,
                intervalClassLimit: 0,
                intervalThreshold: 0,
                stripePriceId: null,
                contractId: null,
                created: new Date(),
                updated: new Date(),
                deleted: new Date(),
            });
        }
    }

    const removeProgramPlan = (params: { id: string, index: number }) => {
        // const { id } = params;
        //    deleteProgramPlan (id, locationId)
        //         .then((response: any) => {
        //             toast({
        //                 title: response.message,
        //             });
        //         })
        //         .catch((error) => {
        //             toast({
        //                 variant: "destructive",
        //                 title: error.response.data.message,
        //             });
        //         });
    };

    const useCopyToClipboard = () => {
        const [isCopied, setIsCopied] = useState(false);

        const copyToClipboard = async (content: string) => {
            try {
                await navigator.clipboard.writeText(content);
                setIsCopied(true);
                console.log('Copied to clipboard:', content);
            } catch (error) {
                setIsCopied(false);
                console.error('Unable to copy to clipboard:', error);
            }
        };

        return { isCopied, copyToClipboard };
    };

    const { isCopied, copyToClipboard } = useCopyToClipboard();


    return (
        <div className="space-y-4">
            <UpsertPlan plan={editPlanOptions.currentPlan} onChange={editPlanOptions.onChange} locationId={locationId} programId={programId} />


            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search subs...' className='w-[250px] h-8 py-2  text-xs rounded-sm' />
                </div>
                <div>
                    <Button variant={"foreground"} size={"sm"} onClick={() => create(null)} >
                        + Plan
                    </Button>
                </div>
            </div>
            <Card className="rounded-sm shadow-none ">

                <CardContent className="p-0 shadow-none">
                    <div>
                        {programPlans.length > 0 ?
                            <Table className=" w-full">
                                <TableHeader className="bg-white/10">
                                    <TableRow >
                                        {["Name", "Type", "Amount", "Family Plan", "Member Limit"].map((title, index) => (
                                            <TableHead key={index} className="h-auto font- py-2" >
                                                {title}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {programPlans?.map((plan: any, index: number) => {
                                        return (
                                            <TableRow className="border-t group cursor-pointer border-gray-200" key={plan?.id}>
                                                <TableCell>
                                                    {plan.name}
                                                </TableCell>
                                                <TableCell>
                                                    {plan.type === "recurring" ? "Subscription" : "Package"}
                                                </TableCell>
                                                <TableCell>
                                                    {formatAmountForDisplay(plan.price / 100, plan.currency)}
                                                    {plan.type === "recurring" ? ` / ${plan.interval}` : ""}
                                                </TableCell>
                                                <TableCell>
                                                    {plan.family ? 'Yes' : 'No'}
                                                </TableCell>
                                                <TableCell>
                                                    {plan.familyMemberLimit}
                                                </TableCell>
                                                {/* <TableCell className={CellStyle}>
                                                    {plan.pricing.paymentMethod != "stripe" && (
                                                        <div className="flex">
                                                            <PencilIcon onClick={() => create(plan)} size={16} />
                                                        </div>
                                                    )}
                                                </TableCell> */}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>

                            </Table>
                            :
                            <div className="text-sm py-6 font-roboto font-bold  text-center">
                                No Plans Found
                            </div>
                        }


                    </div>
                </CardContent>
            </Card>
        </div>

    )
}
