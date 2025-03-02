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
import UpsertPlan from "./upsert-plan";
import { convertToCurrency } from "@/libs/utils";
import { PencilIcon } from "lucide-react";
import { MemberPlan } from "@/types";
import { Plaster } from "next/font/google";

const CellStyle = "text-sm py-4 px-6 ";

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
    const columns: Array<string> = ["Name", "Billing Period", "Amount", "Family", "Member Limit"];
    // const columns: Array<string> = ["Name", "Billing Period", "Amount", "Family", "Member Limit", "Action"];

    return (
        <>
            <UpsertPlan plan={editPlanOptions.currentPlan} onChange={editPlanOptions.onChange} locationId={locationId} programId={programId} />
            <Card className="rounded-sm shadow-none ">
                <CardHeader className="p-0">
                    <div className="flex flex-row items-center justify-between border-b ">
                        <div className="flex-initial inline-block text-sm font-poppins px-5 font-bold  capitalize ">
                            Plans
                        </div>
                        <div className="flex">
                            <Button variant={"ghost"} className={"border-l rounded-none"} onClick={() => create(null)} >
                                Create Plan
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 shadow-none">
                    <div>
                        {programPlans.length > 0 ?
                            <Table className=" w-full">
                                <TableHeader className="bg-white/10 text-xs">
                                    <TableRow >
                                        {columns.map((title, index) => (
                                            <TableHead key={index} className="font-semibold  text-xs" >
                                                {title}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {programPlans?.map((plan: any, index: number) => {
                                        return (
                                            <TableRow className="border-t group cursor-pointer border-gray-200" key={plan?.id}>
                                                <TableCell className={CellStyle}>
                                                    <h1>{plan.name}</h1>
                                                    <p className="text-xs">{plan.description}</p>
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {plan.interval}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {convertToCurrency(plan.price, '$', 'USD')}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {plan.family ? 'Allowed' : 'N/A'}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
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
        </>

    )
}
