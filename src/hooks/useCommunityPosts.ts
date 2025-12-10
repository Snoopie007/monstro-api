import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GroupPost } from "@/types/groups";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const useCommunityPosts = ({ id, gid }: { id: string, gid: string }) => {
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['communityPosts', id, gid],
        queryFn: () => fetcher(`/api/protected/loc/${id}/groups/${gid}/posts`),
    });

    // Posts are already sorted server-side by pinned (desc) and created (desc)
    const posts: GroupPost[] = data?.posts ?? [];

    const deletePostMutation = useMutation({
        mutationFn: async (postId: string) => {
            const response = await fetch(`/api/protected/loc/${id}/groups/${gid}/posts/${postId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete post');
            }
            return response.json();
        },
        onMutate: async (postId) => {
            setIsDeleting(true);
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['communityPosts', id, gid] });
            
            // Snapshot the previous value
            const previousPosts = queryClient.getQueryData(['communityPosts', id, gid]);
            
            // Optimistically update to the new value
            queryClient.setQueryData(['communityPosts', id, gid], (old: any) => ({
                ...old,
                posts: old?.posts?.filter((p: GroupPost) => p.id !== postId) ?? [],
            }));
            
            return { previousPosts };
        },
        onError: (err, postId, context) => {
            // Rollback on error
            if (context?.previousPosts) {
                queryClient.setQueryData(['communityPosts', id, gid], context.previousPosts);
            }
            console.error('Error deleting post:', err);
        },
        onSettled: () => {
            setIsDeleting(false);
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['communityPosts', id, gid] });
        },
    });

    const deletePost = async (postId: string) => {
        return deletePostMutation.mutateAsync(postId);
    };

    return { 
        posts, 
        error, 
        isLoading, 
        refetch, 
        deletePost,
        isDeleting,
    };
}
