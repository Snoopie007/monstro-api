import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PostComment } from "@/types/groups";
import { useState, useMemo } from "react";
import { clientsideApiClient } from "@/libs/api/client";
import { useSession } from "./useSession";

type UsePostCommentsParams = {
    locationId: string;
    groupId: string;
    postId: string;
};

type AddCommentParams = {
    content: string;
    parentId?: string;
};

export function usePostComments({ locationId, groupId, postId }: UsePostCommentsParams) {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const queryKey = ["postComments", locationId, groupId, postId];
    const [loadingRepliesFor, setLoadingRepliesFor] = useState<string | null>(null);

    // Create API client with auth token
    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);

    // Fetch comments from monstro-api
    const { data, error, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!api) throw new Error("No API client available");
            // monstro-api returns array directly
            const comments = await api.get<PostComment[]>(`/protected/comments/post/${postId}`);
            return { comments };
        },
        enabled: !!postId && !!api,
    });

    // Helper function to recursively add reply to a comment
    const addReplyToComment = (comments: PostComment[], parentId: string, newReply: PostComment): PostComment[] => {
        return comments.map((comment) => {
            if (comment.id === parentId) {
                // Found the parent, add reply to its replies array
                return {
                    ...comment,
                    replies: [newReply, ...(comment.replies || [])],
                    replyCounts: (comment.replyCounts || 0) + 1,
                };
            }
            // Check nested replies recursively
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: addReplyToComment(comment.replies, parentId, newReply),
                };
            }
            return comment;
        });
    };

    // Add comment mutation - calls monstro-api
    const addCommentMutation = useMutation({
        mutationFn: async ({ content, parentId }: AddCommentParams) => {
            if (!api || !session?.user) throw new Error("No API client available");
            
            // Get the userId to pass to monstro-api (vendorId for vendors)
            // monstro-api expects memberId or vendorId, then resolves to user.id
            const userId = session.user.vendorId || session.user.staffId;
            if (!userId) {
                throw new Error("No vendorId or staffId available");
            }

            // Calculate depth based on parent
            let depth = 0;
            if (parentId) {
                const existingComments = data?.comments || [];
                const findDepth = (comments: PostComment[]): number => {
                    for (const c of comments) {
                        if (c.id === parentId) return c.depth || 0;
                        if (c.replies?.length) {
                            const found = findDepth(c.replies);
                            if (found >= 0) return found;
                        }
                    }
                    return 0;
                };
                depth = findDepth(existingComments);
            }

            const comment = await api.post(`/protected/comments/post/${postId}`, {
                content,
                type: 'post',
                depth: parentId ? depth + 1 : 0,
                userId,
                parentId,
            });

            // Return both the comment and the parentId for proper cache update
            return { comment, parentId };
        },
        onSuccess: (data) => {
            const { comment, parentId } = data as { comment: PostComment; parentId?: string };
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.comments) return { comments: parentId ? [] : [comment] };
                
                if (parentId) {
                    // This is a reply - add it to the parent comment's replies
                    return {
                        ...old,
                        comments: addReplyToComment(old.comments, parentId, comment),
                    };
                } else {
                    // This is a top-level comment - add to the beginning
                    return {
                        ...old,
                        comments: [comment, ...old.comments],
                    };
                }
            });
        },
    });

    // Like comment mutation - calls monstro-api
    const likeCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            if (!api) throw new Error("No API client available");
            return api.post(`/protected/comments/${commentId}/likes`);
        },
        onSuccess: (data: any, commentId) => {
            // Update the likes count in the cache
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.comments) return old;
                return {
                    ...old,
                    comments: old.comments.map((c: PostComment) =>
                        c.id === commentId ? { ...c, likeCounts: data.likeCounts } : c
                    ),
                };
            });
        },
    });

    // Delete comment mutation - stays local (no monstro-api endpoint)
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            const response = await fetch(
                `/protected/loc/${locationId}/groups/${groupId}/posts/${postId}/comments/${commentId}`,
                { method: "DELETE" }
            );
            if (!response.ok) throw new Error("Failed to delete comment");
            return response.json();
        },
        onSuccess: (_, commentId) => {
            // Remove the comment from the cache
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.comments) return old;
                return {
                    ...old,
                    comments: old.comments.filter((c: PostComment) => c.id !== commentId),
                };
            });
        },
    });

    // Load replies for a specific comment - calls monstro-api
    const loadReplies = async (commentId: string) => {
        if (!api) return;
        
        setLoadingRepliesFor(commentId);
        try {
            // monstro-api returns array directly
            const replies = await api.get<PostComment[]>(`/protected/comments/${commentId}/replies`);

            // Update the comment in cache with its replies
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.comments) return old;
                return {
                    ...old,
                    comments: old.comments.map((c: PostComment) =>
                        c.id === commentId ? { ...c, replies } : c
                    ),
                };
            });
        } finally {
            setLoadingRepliesFor(null);
        }
    };

    return {
        comments: (data?.comments ?? []) as PostComment[],
        error,
        isLoading,
        refetch,
        addComment: (params: AddCommentParams) => addCommentMutation.mutateAsync(params),
        likeComment: (commentId: string) => likeCommentMutation.mutateAsync(commentId),
        deleteComment: (commentId: string) => deleteCommentMutation.mutateAsync(commentId),
        isAddingComment: addCommentMutation.isPending,
        loadReplies,
        loadingRepliesFor,
    };
}

// Hook for fetching replies to a specific comment
export function useCommentReplies({
    locationId,
    groupId,
    postId,
    commentId,
    enabled = true,
}: UsePostCommentsParams & { commentId: string; enabled?: boolean }) {
    const { data: session } = useSession();
    
    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);

    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ["commentReplies", locationId, groupId, postId, commentId],
        queryFn: async () => {
            if (!api) throw new Error("No API client available");
            // monstro-api returns array directly
            const replies = await api.get<PostComment[]>(`/protected/comments/${commentId}/replies`);
            return { replies };
        },
        enabled: enabled && !!commentId && !!api,
    });

    return {
        replies: (data?.replies ?? []) as PostComment[],
        error,
        isLoading,
        refetch,
    };
}
