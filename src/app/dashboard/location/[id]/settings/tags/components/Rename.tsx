"use client";

import { useState, useEffect, SetStateAction, Dispatch } from "react";
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
} from "@/components/ui/dialog";
import { MemberTag } from "@subtrees/types";
import { useTags } from "@/hooks/useTags";
import { Loader2 } from "lucide-react";

interface RenameProps {
    lid: string;
    tag: MemberTag | null;
    open: boolean;
    onOpenChange: Dispatch<SetStateAction<boolean>>;
}

export default function Rename({ lid, tag, open, onOpenChange }: RenameProps) {
    const { updateTag } = useTags(lid);
    const [tagName, setTagName] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (tag) {
            setTagName(tag.name);
        }
    }, [tag]);

    const handleRename = async () => {
        if (!tag || !tagName.trim()) return;

        try {
            await updateTag(tag.id, { name: tagName.trim() });
            setTagName("");
            handleOpenChange(false);
        } catch (error) {
            console.error("Failed to update tag:", error);
        } finally {
            setLoading(false);
        }
    };

    function handleOpenChange(open: boolean) {
        onOpenChange(open);
        if (!open) {
            setTagName("");
        }
    }
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Tag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 px-4">
                    <div>
                        <Input
                            placeholder="Tag name"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="flex sm:justify-between">
                    <DialogClose asChild>
                        <Button variant="outline" className="border-foreground/10">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant="primary" onClick={handleRename} disabled={!tagName.trim()}>
                        {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Update Tag"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

