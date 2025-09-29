import { Dialog, Tooltip, TooltipProvider, DialogTrigger, DialogFooter, Button, TooltipTrigger, TooltipContent, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge } from "@/components/ui";
import { MemberTag } from "@/types";
import { PlusIcon, Loader2 } from "lucide-react";

interface ManageTagsDialogProps {
    isManageDialogOpen: boolean,
    setIsManageDialogOpen: (open: boolean) => void,
    openManageDialog: () => void,
    selectedTagIds: string[],
    allTags: MemberTag[],
    handleRemove: (tagId: string) => void,
    newTag: string,
    setNewTag: (newTag: string) => void,
    handleCreateTag: () => void,
    handleSaveTags: () => void,
    isUpdatingTags: boolean,
    handleSelect: (tagId: string) => void,
}

export function ManageTagsDialog({ isManageDialogOpen, setIsManageDialogOpen, openManageDialog,selectedTagIds, allTags, handleRemove, newTag, setNewTag, handleCreateTag, handleSaveTags, isUpdatingTags, handleSelect }: ManageTagsDialogProps) {
    return (
        <div>
            {/* Dialog with TagsFilter component inside */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="max-w-md border-foreground/10">
                    <DialogHeader>
                        <DialogTitle className="text-base">Manage Member Tags</DialogTitle>
                        <DialogDescription className="text-sm">
                            Use the filter below to select tags for this member
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 space-y-4">
                        {/* Selected tags display */}
                        {selectedTagIds.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Selected Tags:
                                </label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedTagIds.map((tagId) => (
                                        <Badge
                                            key={tagId}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-2 py-1"
                                        >
                                            {allTags.find((t) => t.id === tagId)?.name}
                                            <button
                                                onClick={() => handleRemove(tagId)}
                                                className="ml-1 hover:text-destructive cursor-pointer"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search and select tags */}
                        <div>
                            <label className="text-sm font-medium text-foreground">
                                Search Tags:
                            </label>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    placeholder="Search or create tag..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="w-full px-3 py-2 border border-foreground/20 bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Available tags list */}
                        <div className="max-h-48 overflow-y-auto border border-foreground/10 rounded-md">
                            {newTag.trim() &&
                                !allTags.some(
                                    (tag) => tag.name.toLowerCase() === newTag.toLowerCase()
                                ) && (
                                    <div className="p-2 border-b border-foreground/10">
                                        <button
                                            onClick={handleCreateTag}
                                            className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted rounded-md text-sm"
                                        >
                                            <PlusIcon className="h-4 w-4 text-muted-foreground" />
                                            Create new tag: "{newTag}"
                                        </button>
                                    </div>
                                )}

                            {allTags
                                .filter((tag) =>
                                    tag.name.toLowerCase().includes(newTag.toLowerCase())
                                )
                                .map((tag) => (
                                    <div
                                        key={tag.id}
                                        onClick={() => handleSelect(tag.id)}
                                        className="flex items-center justify-between border-foreground/10 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTagIds.includes(tag.id)}
                                                    onChange={() => handleSelect(tag.id)}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">{tag.name}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {tag.memberCount || 0} members
                                        </span>
                                    </div>
                                ))}

                            {allTags.filter((tag) =>
                                tag.name.toLowerCase().includes(newTag.toLowerCase())
                            ).length === 0 &&
                                !newTag.trim() && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Type to search for tags
                                    </div>
                                )}

                            {allTags.filter((tag) =>
                                tag.name.toLowerCase().includes(newTag.toLowerCase())
                            ).length === 0 &&
                                newTag.trim() && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No tags found matching "{newTag}"
                                    </div>
                                )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsManageDialogOpen(false)} size="sm">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTags}
                            size="sm"
                            variant="secondary"
                            disabled={isUpdatingTags}
                        >
                            {isUpdatingTags ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}