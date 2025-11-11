"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { VisuallyHidden } from "react-aria";

interface NewTagProps {
    lid: string;
}

export default function NewTag({ lid }: NewTagProps) {
    const [tagName, setTagName] = useState("");
    const [open, setOpen] = useState(false);

    const handleCreate = async () => {
        if (!tagName.trim()) return;

        try {

            setTagName("");
        } catch (error) {
            console.error("Failed to create tag:", error);
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
                        />
                    </div>
                </div>
                <DialogFooter className="flex sm:justify-between">
                    <DialogClose asChild>
                        <Button variant="outline" className="border-foreground/10">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant="primary" onClick={handleCreate} disabled={!tagName.trim()}>
                        Create Tag
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

