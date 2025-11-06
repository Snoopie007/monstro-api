"use client";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui";
import { Pencil, Trash2, Copy, MoreHorizontal, Loader2Icon } from "lucide-react";
import { MemberField } from "@/types";
import EditField from "./EditField";
import { useState } from "react";
import { cn } from "@/libs/utils";
import { VisuallyHidden } from "react-aria";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";


const HoverTransition = "group-hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300";

export default function CFActions({ field }: { field: MemberField }) {
    const [open, setOpen] = useState(false)
    const lid = field.locationId
    const [loading, setLoading] = useState(false)
    async function handleDelete() {
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs/${field.id}`, {
                method: "DELETE",
            })
        );
        if (error) {
            setLoading(false)
            toast.error(error.message);
            return;
        }
        setLoading(false)

    }


    async function handleDuplicate() {
        setLoading(true)
        const { error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs/${field.id}`, {
                method: "POST",
            })
        );
        if (error) {
            toast.error(error.message);
            return;
        }
        setLoading(false)
    }


    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg border-foreground/10 sm:rounded-lg overflow-hidden p-4">
                    <VisuallyHidden className="pb-0 pt-5">
                        <DialogTitle className="text-sm"></DialogTitle>
                    </VisuallyHidden>

                    <EditField field={field} onClose={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
            <div className="flex flex-row items-center group">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 flex-1  rounded-r-none", HoverTransition)}
                    onClick={() => setOpen(true)}
                    disabled={loading}
                >
                    {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 flex-1  rounded-none", HoverTransition)}
                    disabled={loading}
                    onClick={handleDuplicate}
                >
                    <Copy className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-8 rounded-none flex-1", HoverTransition)}
                    disabled={!field || loading}
                    onClick={handleDelete}
                >
                    {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 group-hover:bg-foreground/10 flex-1 rounded-l-none"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-foreground/10 ">
                        <DropdownMenuItem
                            className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
                            onClick={() => setOpen(true)}
                            disabled={!field}
                        >
                            <span > Edit</span>
                            <Pencil className="size-3" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
                            onClick={handleDuplicate}
                            disabled={!field}
                        >
                            <span > Duplicate</span>
                            <Copy className="size-3" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
                            onClick={handleDelete}
                            disabled={!field}
                        >
                            <span > Delete</span>
                            <Trash2 className="size-3" />
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
}
