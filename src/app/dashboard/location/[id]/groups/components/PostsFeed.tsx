"use client";

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  Button, 
  Card, 
  CardContent, 
  Empty, 
  EmptyDescription, 
  EmptyHeader, 
  EmptyTitle, 
  Skeleton 
} from "@/components/ui";
import { Pencil } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostDetailModal } from "./PostDetailModal";
import { GroupPost } from "@/types/groups";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { CreatePostDialog } from "./CreatePostDialog";
import { useState, useCallback } from "react";
import { useSession } from "@/hooks/useSession";

interface PostsFeedProps {
  id: string;
  gid: string;
  groupName: string;
}

export function PostsFeed({ id, gid, groupName }: PostsFeedProps) {
  const { posts, error, isLoading, refetch, deletePost, isDeleting } = useCommunityPosts({ id, gid });
  const { data: session } = useSession();
  const hasPosts = posts?.length > 0;
  
  const [selectedPost, setSelectedPost] = useState<GroupPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<GroupPost | null>(null);

  const handleOpenPostDetail = (post: GroupPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  };
  
  const handleRequestDelete = useCallback((post: GroupPost) => {
    setPostToDelete(post);
    setDeleteConfirmOpen(true);
  }, []);
  
  const handleConfirmDelete = useCallback(async () => {
    if (postToDelete) {
      try {
        await deletePost(postToDelete.id);
        setDeleteConfirmOpen(false);
        setPostToDelete(null);
        // If this post was open in the modal, close it
        if (selectedPost?.id === postToDelete.id) {
          setIsModalOpen(false);
          setSelectedPost(null);
        }
      } catch (err) {
        console.error('Failed to delete post:', err);
      }
    }
  }, [postToDelete, deletePost, selectedPost]);
  
  // Check if user can delete a post (post owner or staff - staff check is on server)
  // For now, we show the option to all logged-in users, server will validate
  const canDeletePost = (post: GroupPost) => {
    return !!session?.user?.id;
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Community feed
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Group posts
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <CreatePostDialog 
            groupId={gid} 
            groupName={groupName}
            onSuccess={refetch}
            trigger={
              <Button variant="primary" size="sm" className="gap-2 rounded-full">
                <Pencil size={16} />
                Create post
              </Button>
            }
          />
        </div>
      </header>

      {isLoading ? (
        <LoadingState />
      ) : hasPosts ? (
        <div className="space-y-4">
          {posts.map((post: GroupPost) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onOpenDetail={handleOpenPostDetail}
              onDelete={handleRequestDelete}
              canDelete={canDeletePost(post)}
            />
          ))}
        </div>
      ) : (
        <Empty variant="border" className="py-12">
          <EmptyHeader>
            <EmptyTitle>No posts published yet</EmptyTitle>
            <EmptyDescription>
              Share the first win, SOP, or teardown so everyone has a playbook to
              follow.
            </EmptyDescription>
          </EmptyHeader>
          <CreatePostDialog 
            groupId={gid} 
            groupName={groupName}
            onSuccess={refetch}
            trigger={
              <Button variant="primary" className="rounded-full">
                Create the first post
              </Button>
            }
          />
        </Empty>
      )}

      {/* Post Detail Modal - only render when a post is selected */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          locationId={id}
          groupId={gid}
          open={isModalOpen}
          onOpenChange={handleCloseModal}
          onDelete={handleRequestDelete}
          canDelete={canDeletePost(selectedPost)}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
              All comments and reactions will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1].map((item) => (
        <Card key={item} className="border-foreground/10">
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
