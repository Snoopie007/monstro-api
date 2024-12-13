import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Button
} from "@/components/ui";
import { convertToCurrency } from "@/libs/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Plan } from "@/types";
import UpsertPlan from "./upsert-plan";
import { Icon } from "@/components/icons";

const CellStyle = "text-sm py-4 px-6 ";

interface ProgramPlansProps {
    programPlans: any[];
    programId: number
    vendorId: number,
    locationId: string
}

export default function ProgramPlans({ programPlans, programId, vendorId, locationId }: ProgramPlansProps) {
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

    const editPlanOptions = useMemo(() => {
        return {
            currentPlan,
            onChange(plan: Plan | null) {
                setCurrentPlan(plan);
            },
        };
    }, [currentPlan]);

    async function create() {
        setCurrentPlan({
            name: '',
            description: '',
            family: false,
            program_id: programId,
            vendor_id: vendorId,
            family_member_limit: 0,
            pricing: {
                amount: 0.00,
                billing_period: ''
            }
        });
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
                            <Button variant={"ghost"} className={"border-l rounded-none"} onClick={create} >
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
                                                    {plan.pricings.billingPeriod}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {convertToCurrency(plan.pricings.amount, '$', 'USD')}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {plan.family ? 'Allowed' : 'N/A'}
                                                </TableCell>
                                                <TableCell className={CellStyle}>
                                                    {plan.familyMemberLimit}
                                                </TableCell>
                                                {/* <TableCell className={CellStyle}>
                                                    <Icon name="EllipsisVertical" size={16} />
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
