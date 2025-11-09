"use client";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    ButtonGroup,
} from "@/components/ui";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { MemberTag } from "@/types";
import { useState } from "react";
import { cn } from "@/libs/utils";
import { useTags } from "@/hooks/useTags";
import Rename from "./Rename";


const HoverTransition = "group-hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300";
const MenuItemStyle = "cursor-pointer text-xs flex flex-row items-center justify-between gap-2";

export default function TagActions({ lid, tag }: { lid: string, tag: MemberTag }) {
    const [loading, setLoading] = useState(false)
    const { deleteTag } = useTags(lid);
    const [openRename, setOpenRename] = useState(false);
    async function handleDelete() {
        if (!tag.id) return;
        setLoading(true);
        await deleteTag(tag.id);
        setLoading(false);
    }



    return (
        <>
            <Rename lid={lid} tag={tag} open={openRename} onOpenChange={setOpenRename} />
            <ButtonGroup className="group">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8", HoverTransition)}
                    disabled={loading}
                    onClick={() => setOpenRename(true)}
                >
                    <Pencil className="size-3.5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 ", HoverTransition)}
                    disabled={loading}
                    onClick={handleDelete}
                >
                    <Trash2 className="size-3.5" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 group-hover:bg-foreground/10"
                        >
                            <MoreHorizontal className="size-4.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-foreground/10 ">
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={() => setOpenRename(true)}
                            disabled={loading}
                        >
                            <span >Rename</span>
                            <Pencil className="size-3" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            disabled={loading}
                        >
                            <span > Delete</span>
                            <Trash2 className="size-3" />
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>
            </ButtonGroup >
        </>
    );
}
