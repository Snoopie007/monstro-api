"use client";

import { use, useState } from "react";
import { useTags } from "@/hooks/useTags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MemberTag } from "@/types";

export default function TagsManagementPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags(
    params.id
  );

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<MemberTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<MemberTag | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [editTagName, setEditTagName] = useState("");

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      await createTag({ name: newTagName.trim() });
      setNewTagName("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleEditTag = async () => {
    if (!editingTag || !editTagName.trim()) return;

    try {
      await updateTag(editingTag.id, { name: editTagName.trim() });
      setEditingTag(null);
      setEditTagName("");
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    try {
      await deleteTag(deletingTag.id);
      setDeletingTag(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  const openEditDialog = (tag: MemberTag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (tag: MemberTag) => {
    setDeletingTag(tag);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tags Management</h1>
          <p className="text-muted-foreground">
            Create and manage member tags for better organization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to organize your members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateTag()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tags ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tags created yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first tag to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Badge variant="secondary">{tag.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {tag.memberCount || 0} members
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(tag.created).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(tag)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update the tag name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Tag name"
                value={editTagName}
                onChange={(e) => setEditTagName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleEditTag()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTag} disabled={!editTagName.trim()}>
              Update Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTag?.name}"? This will
              remove the tag from all members and cannot be undone.
              {deletingTag?.memberCount && deletingTag.memberCount > 0 && (
                <span className="block mt-2 text-orange-600">
                  This tag is currently assigned to {deletingTag.memberCount}{" "}
                  member(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTag}>
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
