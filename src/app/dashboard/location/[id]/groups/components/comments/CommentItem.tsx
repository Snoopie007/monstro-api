"use client";

import { Button } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/libs/utils";
import { PostComment } from "@subtrees/types/vendor/social/group";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { useState } from "react";

type CommentItemProps = {
    comment: PostComment;
    depth?: number;
    maxVisualDepth?: number;
    onReply: (comment: PostComment) => void;
    onLike: (commentId: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
    currentUserId?: string;
    isLoadingReplies?: boolean;
    onLoadReplies?: (commentId: string) => void;
};

export function CommentItem({
    comment,
    depth = 0,
    maxVisualDepth = 4,
    onReply,
    onLike,
    onDelete,
    currentUserId,
    isLoadingReplies,
    onLoadReplies,
}: CommentItemProps) {
    const [isLiking, setIsLiking] = useState(false);
    const [showReplies, setShowReplies] = useState(false);

    const visualDepth = Math.min(depth, maxVisualDepth);
    const isNested = depth > 0;
    const hasReplies = (comment.replyCounts ?? 0) > 0;
    const canShowNestedReplies = comment.replies && comment.replies.length > 0;

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            await onLike(comment.id);
        } finally {
            setIsLiking(false);
        }
    };

    const handleToggleReplies = () => {
        if (!showReplies && hasReplies && !canShowNestedReplies && onLoadReplies) {
            onLoadReplies(comment.id);
        }
        setShowReplies(!showReplies);
    };

    const timeAgo = formatDistanceToNow(new Date(comment.created), { addSuffix: true });
    const userName = comment.user?.name ?? "Unknown";
    const userInitial = userName.charAt(0).toUpperCase();
    const isOwner = currentUserId === comment.userId;

    // Calculate visual indentation (capped at maxVisualDepth)
    const marginLeft = visualDepth * 24;

    // For deeply nested comments, show "replying to @user" prefix
    const replyingToUser = depth > maxVisualDepth && comment.parent?.user?.name;

    return (
        <div 
            className={cn("flex flex-col", isNested && "mt-2")}
            style={{ marginLeft: `${marginLeft}px` }}
        >
            <div className="flex gap-2 items-start">
                <Avatar className={cn(
                    "flex-shrink-0",
                    depth === 0 ? "h-8 w-8" : "h-6 w-6"
                )}>
                    {comment.user?.image ? (
                        <AvatarImage src={comment.user.image} alt={userName} />
                    ) : (
                        <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
                    )}
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Comment bubble */}
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{userName}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                            {comment.pinned && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                    Pinned
                                </span>
                            )}
                        </div>
                        {replyingToUser && (
                            <span className="text-xs text-blue-500">
                                @{replyingToUser}{" "}
                            </span>
                        )}
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-1">
                        <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 px-2 text-muted-foreground hover:text-foreground"
                            onClick={handleLike}
                            disabled={isLiking}
                        >
                            <Heart className={cn("h-3.5 w-3.5 mr-1", (comment.likes?.length ?? 0) > 0 && "fill-red-500 text-red-500")} />
                            {(comment.likes?.length ?? 0) > 0 && <span className="text-xs">{comment.likes?.length}</span>}
                        </Button>
                        <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => onReply(comment)}
                        >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Reply</span>
                        </Button>
                        {isOwner && onDelete && (
                            <Button
                                variant="ghost"
                                size="xs"
                                className="h-6 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete(comment.id)}
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>

                    {/* Show replies toggle */}
                    {hasReplies && !canShowNestedReplies && (
                        <button
                            className="text-xs text-blue-500 font-medium mt-1 hover:underline"
                            onClick={handleToggleReplies}
                        >
                            {showReplies ? "Hide" : "View"} {comment.replyCounts} {comment.replyCounts === 1 ? "reply" : "replies"}
                        </button>
                    )}
                </div>
            </div>

            {/* Nested replies */}
            {(showReplies || canShowNestedReplies) && comment.replies && comment.replies.length > 0 && (
                <div className="mt-2">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            maxVisualDepth={maxVisualDepth}
                            onReply={onReply}
                            onLike={onLike}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}

            {isLoadingReplies && showReplies && (
                <div className="ml-6 mt-2 text-xs text-muted-foreground">
                    Loading replies...
                </div>
            )}
        </div>
    );
}

