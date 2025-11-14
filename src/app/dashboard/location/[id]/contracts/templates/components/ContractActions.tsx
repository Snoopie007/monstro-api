"use client";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
    DropdownMenuSeparator,
    ButtonGroup,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { Contract } from "@/types";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useState } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermissions";

interface ContractActionsProps {
    contract: Contract;
    lid: string;
}

const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";
const HoverTransition = "group-hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300";
export default function ContractActions({
    contract,
    lid,
}: ContractActionsProps) {
    const [loading, setLoading] = useState(false);
    const canEditContract = usePermission('edit contract', lid);
    const canDeleteContract = usePermission('delete contract', lid);

    async function onDelete() {
        if (!contract.id) return;
        setLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/contracts/${contract.id}`, {
                method: 'DELETE',
            })
        );

        setLoading(false);

        if (result?.status === 403) {
            toast.error('You are not authorized to delete this contract');
            return;
        }

        if (error && !result) {
            toast.error(error.message);
            return;
        }

        toast.success('Contract deleted successfully');

    }

    return (
        <ButtonGroup className="group">
            <Button variant="ghost" size="icon" className={cn("size-8", HoverTransition)}>
                <Link href={`/builder/${lid}/contract/${contract.id}`}>
                    <Pencil className="size-3.5" />
                </Link>
            </Button>
            <Button variant="ghost" size="icon" className={cn("size-8", HoverTransition)}>
                <Trash2 className="size-3.5" onClick={onDelete} />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-foreground/10 ">
                    {contract.editable && canEditContract && (
                        <DropdownMenuItem className={ItemBtnStyle} asChild>
                            <Link href={`/builder/${lid}/contract/${contract.id}`}>
                                <span>Edit</span>
                                <Pencil className="size-3" />
                            </Link>
                        </DropdownMenuItem>
                    )}
                    {contract.editable && canDeleteContract && (
                        <>
                            <DropdownMenuSeparator className="mb-2" />
                            <DropdownMenuItem
                                className={cn(ItemBtnStyle, "text-red-500 hover:text-red-500")}
                                onClick={onDelete}
                                disabled={loading}
                            >
                                <span>Delete</span>
                                <Trash2 className="size-3" />
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </ButtonGroup>
    );
}
