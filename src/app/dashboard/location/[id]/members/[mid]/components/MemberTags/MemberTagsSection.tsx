
'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Button,
} from "@/components/ui"
import { useMemberTags, useTags } from "@/hooks/useTags"
import { useEffect, useState } from "react";

import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { ManageTagsDialog } from "./ManageTagsDialog";
import { PlusIcon } from "lucide-react";


interface MemberTagSectionProps {
    params: { id: string, mid: string }
}

export function MemberTagSection({ params }: MemberTagSectionProps) {
    const {
        tags: allTags,
        isLoading: isLoadingAllTags,
        createTag,
    } = useTags(params.id);
    const {
        tags: memberTags,
        isLoading: isLoadingMemberTags,
        updateMemberTags,
    } = useMemberTags(params.id, params.mid);

    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");


    // Initialize selected tags when member tags load or dialog opens
    useEffect(() => {
        if (isManageDialogOpen) {
            setSelectedTagIds(memberTags.map((tag) => tag.id));
        }
    }, [memberTags, isManageDialogOpen]);

    const handleRemove = (tagId: string) => {
        const newSelectedTags = selectedTagIds.filter((id) => id !== tagId);
        setSelectedTagIds(newSelectedTags);
    };

    const handleSelect = (value: string) => {
        let newSelectedTags;
        if (selectedTagIds.includes(value)) {
            newSelectedTags = selectedTagIds.filter((id) => id !== value);
        } else {
            newSelectedTags = [...selectedTagIds, value];
        }
        setSelectedTagIds(newSelectedTags);
    };

    const handleCreateTag = async () => {
        if (!newTag.trim()) return;

        try {
            const createdTag = await createTag({ name: newTag.trim() });
            // Add the new tag to selected tags
            const newSelectedTags = [...selectedTagIds, createdTag.id];
            setSelectedTagIds(newSelectedTags);
            setNewTag("");
            toast.success(`Tag "${newTag.trim()}" created`);
        } catch (error) {
            // Show user-friendly error message
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
        }
    };

    const handleSaveTags = async () => {
        setIsUpdatingTags(true);
        try {
            await updateMemberTags(selectedTagIds);
            setIsManageDialogOpen(false);
            toast.success("Member tags updated successfully");
        } catch (error) {
            toast.error("Failed to update tags. Please try again.");
            console.error("Failed to update tags:", error);
        } finally {
            setIsUpdatingTags(false);
        }
    };

    const openManageDialog = () => {
        setSelectedTagIds(memberTags.map((tag) => tag.id));
        setNewTag("");
        setIsManageDialogOpen(true);
    };

    if (isLoadingMemberTags || isLoadingAllTags) {
        return (
            <div className="flex flex-row gap-2 p-4">
                <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
            </div>
        );
    }



    return (
        <Card className='border-foreground/10 border-x-0 border-y'>
            <CardHeader className='border-none px-4 py-2 bg-foreground/5' >
                <div className='flex flex-row items-center justify-between'>
                    <CardTitle className="text-sm  ">
                        Member Tags
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={openManageDialog}>
                        <PlusIcon className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className='px-4 py-2' >
                <ul className="space-x-2 space-y-2">
                    {memberTags.length === 0 && (
                        <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                    {memberTags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs cursor-pointer">
                            {tag.name}
                        </Badge>
                    ))}
                </ul>
                <ManageTagsDialog isManageDialogOpen={isManageDialogOpen} setIsManageDialogOpen={setIsManageDialogOpen} openManageDialog={openManageDialog} selectedTagIds={selectedTagIds} allTags={allTags} handleRemove={handleRemove} newTag={newTag} setNewTag={setNewTag} handleCreateTag={handleCreateTag} handleSaveTags={handleSaveTags} isUpdatingTags={isUpdatingTags} handleSelect={handleSelect} />
            </CardContent>
        </Card >
    )
}
