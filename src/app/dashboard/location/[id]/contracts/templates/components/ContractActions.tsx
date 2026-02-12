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
import { cn } from "@/libs/utils";
import { Contract } from "@subtrees/types";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermissions";
import RemoveContract from "./RemoveContract";
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
    const canEditContract = usePermission('edit contract', lid);
    const canDeleteContract = usePermission('delete contract', lid);
    const [openRemove, setOpenRemove] = useState(false);


    return (
        <>
            <RemoveContract cid={contract.id} editable={contract.editable} lid={lid} open={openRemove} onOpenChange={setOpenRemove} />
            <ButtonGroup className="group">
                <Button variant="ghost" size="icon" className={cn("size-8", HoverTransition)}>
                    <Link href={`/builder/${lid}/contract/${contract.id}`}>
                        <Pencil className="size-3.5" />
                    </Link>
                </Button>
                <Button variant="ghost" size="icon" className={cn("size-8", HoverTransition)}>
                    <Trash2 className="size-3.5" onClick={() => setOpenRemove(true)} />
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className={cn(ItemBtnStyle, "text-red-500 hover:text-red-500")}
                                    onClick={() => setOpenRemove(true)}
                                >
                                    <span>Delete</span>
                                    <Trash2 className="size-3.5" />
                                </DropdownMenuItem>
                            </>
                        )}

                    </DropdownMenuContent>
                </DropdownMenu>
            </ButtonGroup>
        </>
    );
}