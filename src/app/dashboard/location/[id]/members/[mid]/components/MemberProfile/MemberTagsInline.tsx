"use client";

import { useMemberTags, useTags } from "@/hooks/useTags";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/ToolTip";

interface MemberTagsInlineProps {
  params: { id: string; mid: string };
}

export function MemberTagsInline({ params }: MemberTagsInlineProps) {
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
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 bg-muted animate-pulse rounded"></div>
        <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
        <div className="h-6 w-6 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  // Show maximum 2 tags, then truncate for the display badges
  const visibleTags = memberTags.slice(0, 2);
  const remainingCount = memberTags.length - 2;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display current tags (max 2) */}
      {visibleTags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="text-xs">
          {tag.name}
        </Badge>
      ))}

      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} tags
        </Badge>
      )}

      {memberTags.length === 0 && (
        <span className="text-xs text-muted-foreground">No tags</span>
      )}

      {/* Dialog with TagsFilter component inside */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogTrigger asChild>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openManageDialog}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage tags</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogTrigger>
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
  );
}
