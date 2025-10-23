import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    Button,
    DropdownMenuItem,
} from "@/components/ui";
import { EllipsisVertical } from "lucide-react";
import DeleteMemberDialog from "./DeleteMemberDialog";
import EditMemberDialog from "./EditMemberDialog";
import ChargeItem from "./ChargeItem";
import { useState } from "react";

interface ProfileActionsProps {
    params: { id: string; mid: string }
}

export function ProfileActions({ params }: ProfileActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
    const [showChargeDialog, setShowChargeDialog] = useState<boolean>(false);


    return (
        <>

            <DropdownMenu >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={"ghost"}
                        size="icon"
                        className="size-6 bg-foreground/5"
                    >
                        <EllipsisVertical className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] border-foreground/20">
                    <DropdownMenuItem onSelect={() => setShowEditDialog(true)}>
                        Edit Member
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowChargeDialog(true)}>
                        Charge Item
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowDeleteDialog(true)}>
                        Delete Member
                    </DropdownMenuItem>

                </DropdownMenuContent>
            </DropdownMenu>
            <EditMemberDialog params={params} open={showEditDialog} setOpen={setShowEditDialog} />
            <ChargeItem params={params} open={showChargeDialog} setOpen={setShowChargeDialog} />
            <DeleteMemberDialog params={params} open={showDeleteDialog} setOpen={setShowDeleteDialog} />
        </>
    );
}
