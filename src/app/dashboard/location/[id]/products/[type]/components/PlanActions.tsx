"use client";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator,
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { MemberPlan } from "@/types";
import { MoreVertical, Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import { useState } from "react";
import { UpdatePkg, UpdateSub } from "./Update";
import { useSubscriptions, usePackages } from "@/hooks/usePlans";
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
    const [openArchiveConfirm, setOpenArchiveConfirm] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const { mutate: mutateSubs } = useSubscriptions(lid);
    const { mutate: mutatePkgs } = usePackages(lid);

    const isArchived = plan.archived;
    const planTypeLabel = plan.type === 'recurring' ? 'Subscription' : 'Package';

    async function handleArchiveToggle() {
        setIsArchiving(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/plans/archive/${plan.id}`, {
                method: 'PUT',
                body: JSON.stringify({ archived: !isArchived }),
            })
        );
        setIsArchiving(false);

        if (error || !result || !result.ok) {
            const data = await result?.json().catch(() => ({}));
            toast.error(data.error || `Error ${isArchived ? 'unarchiving' : 'archiving'} the ${planTypeLabel.toLowerCase()}, please try again.`);
            return;
        }

        toast.success(`${planTypeLabel} ${isArchived ? 'unarchived' : 'archived'} successfully`);
        setOpenArchiveConfirm(false);
        
        // Refresh the list
        if (plan.type === 'recurring') {
            await mutateSubs();
        } else {
            await mutatePkgs();
        }
    }

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
                        className={cn(ItemBtnStyle, isArchived ? "text-blue-500 hover:text-blue-500" : "text-red-500 hover:text-red-500")}
                        onClick={() => setOpenArchiveConfirm(true)}
                    >
                        <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
                        {isArchived ? <RotateCcw className="size-3" /> : <Archive className="size-3" />}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={openArchiveConfirm} onOpenChange={setOpenArchiveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isArchived ? 'Unarchive' : 'Archive'} {planTypeLabel}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to {isArchived ? 'unarchive' : 'archive'} &quot;{plan.name}&quot;?
                            {isArchived 
                                ? ' This will make the plan visible again in the plans list.'
                                : ' The plan will be hidden from the plans list but can be unarchived later.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleArchiveToggle} 
                            disabled={isArchiving}
                            className={isArchived ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"}
                        >
                            {isArchiving ? (isArchived ? 'Unarchiving...' : 'Archiving...') : (isArchived ? 'Unarchive' : 'Archive')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
