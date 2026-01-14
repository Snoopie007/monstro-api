"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import { toast } from "react-toastify";

interface NewTagProps {
    lid: string;
}

export default function NewTag({ lid }: NewTagProps) {
    const [tagName, setTagName] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { createTag } = useTags(lid);

    const handleCreate = async () => {
        if (!tagName.trim() || loading) return;

        setLoading(true);
        try {
            await createTag({ name: tagName.trim() });
            toast.success(`Tag "${tagName.trim()}" created successfully`);
            setTagName("");
            setOpen(false);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("already exists")) {
                    toast.error("A tag with this name already exists");
                } else {
                    toast.error("Failed to create tag. Please try again.");
                }
            } else {
                toast.error("Failed to create tag. Please try again.");
            }
            console.error("Failed to create tag:", error);
        } finally {
            setLoading(false);
        }
    };

    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setTagName("");
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="primary" className="flex flex-row items-center gap-2">
                    <span>Create Tag</span>
                    <Plus className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Tag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 px-4">
                    <div>
                        <Input
                            placeholder="Tag name"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            disabled={loading}
                        />
                    </div>
                </div>
                <DialogFooter className="flex sm:justify-between">
                    <DialogClose asChild>
                        <Button variant="outline" className="border-foreground/10" disabled={loading}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant="primary" onClick={handleCreate} disabled={!tagName.trim() || loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Tag"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
