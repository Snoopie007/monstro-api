"use client";

import { PostComment } from "@subtrees/types/vendor/social/group";
import { CommentItem } from "./CommentItem";
import { Skeleton } from "@/components/ui";

type CommentListProps = {
    comments: PostComment[];
    isLoading: boolean;
    onReply: (comment: PostComment) => void;
    onLike: (commentId: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
    currentUserId?: string;
    onLoadReplies?: (commentId: string) => void;
    loadingRepliesFor?: string;
};

export function CommentList({
    comments,
    isLoading,
    onReply,
    onLike,
    onDelete,
    currentUserId,
    onLoadReplies,
    loadingRepliesFor,
}: CommentListProps) {
    if (isLoading) {
        return <CommentListSkeleton />;
    }

    if (comments.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                    No comments yet. Be the first to comment!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    onReply={onReply}
                    onLike={onLike}
                    onDelete={onDelete}
                    currentUserId={currentUserId}
                    onLoadReplies={onLoadReplies}
                    isLoadingReplies={loadingRepliesFor === comment.id}
                />
            ))}
        </div>
    );
}

function CommentListSkeleton() {
    return (
        <div className="space-y-4">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-2 items-start">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

