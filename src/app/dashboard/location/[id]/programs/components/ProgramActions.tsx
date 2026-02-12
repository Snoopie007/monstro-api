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
import { Program } from "@subtrees/types";
import { MoreVertical, Pencil, Pause, Play, Archive, Timer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { UpdateProgram } from "./UpdateProgram";
import { CreateSession } from "./Sessions/CreateSession";

interface ProgramActionsProps {
    program: Program;
    lid: string;
    onSessionCreated?: () => void;
    onDeleted?: () => void;
}

const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";

export default function ProgramActions({
    program,
    lid,
    onSessionCreated,
    onDeleted,
}: ProgramActionsProps) {
    const [openUpdate, setOpenUpdate] = useState(false);
    const [openSession, setOpenSession] = useState(false);
    const [openArchiveConfirm, setOpenArchiveConfirm] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const PATH = `/api/protected/loc/${lid}/programs/${program.id}`;

    async function toggleStatus() {
        const { result, error } = await tryCatch(
            fetch(PATH, {
                method: 'PATCH',
                body: JSON.stringify({ status: program.status === 'active' ? 'inactive' : 'active' }),
            }));
        if (result?.status === 403) {
            toast.error("You are not authorized to update this program");
            return;
        }
        if (error || !result || !result.ok) {
            toast.error("Error updating the program, please try again.");
            return;
        }
    }

    async function archiveProgram() {
        setIsArchiving(true);
        const { result, error } = await tryCatch(
            fetch(PATH, { method: 'DELETE' })
        );
        setIsArchiving(false);

        if (result?.status === 403) {
            toast.error("You are not authorized to archive this program");
            return;
        }
        if (error || !result || !result.ok) {
            toast.error("Error archiving the program, please try again.");
            return;
        }

        toast.success("Program archived successfully");
        setOpenArchiveConfirm(false);
        onDeleted?.();
    }



    return (
        <>
            <CreateSession program={program} availableStaff={[]} staffId={program.instructorId ?? ''} open={openSession} onOpenChange={setOpenSession} onSuccess={onSessionCreated} />
            <UpdateProgram program={program} open={openUpdate} setOpen={setOpenUpdate} />
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
                    <DropdownMenuItem className={ItemBtnStyle} onClick={() => setOpenSession(true)}>
                        <span>Add Session</span>
                        <Timer className="size-3.5" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className={ItemBtnStyle}
                        onClick={() => toggleStatus()}
                    >
                        <span>{program.status === 'active' ? 'Pause' : 'Resume'}</span>
                        {program.status === 'active' ? <Pause className="size-3" /> : <Play className="size-3" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mb-2" />
                    <DropdownMenuItem
                        className={cn(ItemBtnStyle, "text-red-500 hover:text-red-500")}
                        onClick={() => setOpenArchiveConfirm(true)}
                    >
                        <span>Archive</span>
                        <Archive className="size-3" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={openArchiveConfirm} onOpenChange={setOpenArchiveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Program</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive &quot;{program.name}&quot;? 
                            The program will be hidden from the programs list but all attendance history will be preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={archiveProgram} disabled={isArchiving}>
                            {isArchiving ? "Archiving..." : "Archive"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
