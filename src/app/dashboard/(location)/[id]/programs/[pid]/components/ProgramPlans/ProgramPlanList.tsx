import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { CreatePlan } from "./CreatePlan/CreatePlan";
import { formatAmountForDisplay } from "@/libs/utils";
import { MemberPlan } from "@/types";
import { Input } from "@/components/forms/input";


interface ProgramPlansProps {
    programPlans: MemberPlan[];
    pid: number,
    lid: string
}

export default function ProgramPlans({ programPlans, pid, lid }: ProgramPlansProps) {


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


            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search subs...' className='w-[250px] h-8 py-2  text-xs rounded-sm' />
                </div>
                <div>
                    <CreatePlan lid={lid} pid={pid} />
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
