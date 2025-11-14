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
import { Program } from "@/types";
import { MoreVertical, Pencil, Pause, Play, Trash2, Timer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { UpdateProgram } from "./UpdateProgram";
import { CreateSession } from "./Sessions/CreateSession";

interface ProgramActionsProps {
    program: Program;
    lid: string;
}

const ItemBtnStyle = "cursor-pointer font-medium text-xs flex flex-row items-center justify-between gap-2 ";

export default function ProgramActions({
    program,
    lid,
}: ProgramActionsProps) {
    const [openUpdate, setOpenUpdate] = useState(false);
    const [openSession, setOpenSession] = useState(false);
    const PATH = `/api/protected/loc/${lid}/programs/${program.id}`;
    async function toggleStatus() {


    }



    return (
        <>
            <CreateSession program={program} availableStaff={[]} staffId={'staff_id'} open={openSession} onOpenChange={setOpenSession} />
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
