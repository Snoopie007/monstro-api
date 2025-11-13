"use client";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { MemberPlan } from "@/types";
import { MoreVertical, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { UpdatePkg, UpdateSub } from "./Update";
interface PlanActionsProps {
    plan: MemberPlan;
    lid: string;
}

const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";

export default function PlanActions({
    plan,
    lid,
}: PlanActionsProps) {
    const [openUpdate, setOpenUpdate] = useState(false);


    return (
        <>
            {plan.type === 'recurring' ? (
                <UpdateSub lid={lid} sub={plan} open={openUpdate} setOpen={setOpenUpdate} />
            ) : (
                <UpdatePkg lid={lid} pkg={plan} open={openUpdate} setOpen={setOpenUpdate} />
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 bg-foreground/5 rounded-md">
                        <MoreVertical className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] border-foreground/20 p-2">
                    <DropdownMenuItem
                        className={ItemBtnStyle}
                        onClick={() => setOpenUpdate(true)}
                    >
                        <span>Update</span>
                        <Pencil className="size-3" />
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="mb-2" />
                    <DropdownMenuItem
                        className={cn(ItemBtnStyle, "text-red-500 hover:text-red-500")}
                        onClick={() => { }}
                    >
                        <span>Archive</span>
                        <Trash2 className="size-3" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
