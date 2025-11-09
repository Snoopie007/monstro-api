"use client";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    ButtonGroup,
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
    AlertDialogDescription,
    AlertDialogCancel,
} from "@/components/ui";
import { Pencil, Trash2, Copy, MoreHorizontal, Loader2 } from "lucide-react";
import { MemberField } from "@/types";
import { useState } from "react";
import { cn, sleep } from "@/libs/utils";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { useCustomFields } from "../provider";

const HoverTransition = "group-hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300";
const MenuItemStyle = "cursor-pointer text-xs flex flex-row items-center justify-between gap-2";

export default function CFActions({ field }: { field: MemberField }) {
    const { setSelectedField, setFields } = useCustomFields();
    const lid = field.locationId
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false);

    async function handleDeleteConfirm() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs/${field.id}`, {
                method: "DELETE",
            })
        );
        if (error || !result || !result.ok) {
            setLoading(false);
            toast.error(error?.message ?? "Failed to delete custom field");
            return;
        }
        await sleep(1000);
        setLoading(false);
        setOpen(false);
        setFields((prev) => prev.filter((f) => f.id !== field.id));
    }

    async function handleDuplicate() {
        setLoading(true)

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs/${field.id}/dup`, {
                method: "POST",
            })
        );

        if (error || !result || !result.ok) {
            setLoading(false);
            toast.error(error?.message ?? "Failed to duplicate custom field");
            return;
        }
        await sleep(1000);
        const data = await result.json();
        setFields((prev) => [...prev, data]);
        setLoading(false)


    }

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className=" border-foreground/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The custom field will be deleted along with all the data associated with it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={loading}>
                            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}

                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <ButtonGroup className="group">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8", HoverTransition)}
                    onClick={() => setSelectedField(field)}
                    disabled={loading}
                >
                    <Pencil className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 ", HoverTransition)}
                    disabled={loading}
                    onClick={handleDuplicate}
                >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 ", HoverTransition)}
                    disabled={!field || loading}
                    onClick={() => setOpen(true)}
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
                            onClick={() => setSelectedField(field)}
                            disabled={!field}
                        >
                            <span > Edit</span>
                            <Pencil className="size-3" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={handleDuplicate}
                            disabled={!field}
                        >
                            <span > Duplicate</span>
                            <Copy className="size-3" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={() => setOpen(true)}
                            disabled={!field}
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
