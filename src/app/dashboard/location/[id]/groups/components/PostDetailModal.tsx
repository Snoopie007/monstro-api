"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, Button, ScrollArea } from "@/components/ui";
import { GroupPost, PostComment } from "@subtrees/types/vendor/social/group";
import { usePostComments } from "@/hooks/usePostComments";
import { useReactions } from "@/hooks/useReactions";
import { useSession } from "@/hooks/useSession";
import { formatDistanceToNow } from "date-fns";
import { Pin, X, MessageCircle } from "lucide-react";
import Markdown from "react-markdown";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/libs/utils";

import { CommentList, CommentInput } from "./comments";
import { ReactionBar, QuickReactions } from "./reactions";
import { PostActionsDropdown } from "./PostActionsDropdown";

type PostDetailModalProps = {
    post: GroupPost | null;
    locationId: string;
    groupId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete?: (post: GroupPost) => void;
    canDelete?: boolean;
};

export function PostDetailModal({
    post,
    locationId,
    groupId,
    open,
    onOpenChange,
    onDelete,
    canDelete = false,
}: PostDetailModalProps) {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);

    // Hooks for comments and reactions
    const {
        comments,
        isLoading: isLoadingComments,
        addComment,
        likeComment,
        deleteComment,
        isAddingComment,
        loadReplies,
        loadingRepliesFor,
    } = usePostComments({
        locationId,
        groupId,
        postId: post?.id ?? "",
    });

    const {
        reactions,
        isLoading: isLoadingReactions,
        toggleReaction,
        isUpdating: isUpdatingReaction,
    } = useReactions({
        ownerType: "post",
        ownerId: post?.id ?? "",
        enabled: !!post?.id,
    });

    if (!post) return null;

    const timeAgo = formatDistanceToNow(new Date(post.created), { addSuffix: true });
    const userName = post.user?.name ?? "Unknown";
    const userInitial = userName.charAt(0).toUpperCase();

    const handleAddComment = async (content: string, parentId?: string) => {
        await addComment({ content, parentId });
    };

    const handleReply = (comment: PostComment) => {
        setReplyingTo(comment);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const handleToggleReaction = (emoji: { value: string; name: string; type: string }) => {
        toggleReaction(emoji);
    };
    
    const handleDelete = () => {
        if (onDelete && post) {
            onDelete(post);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="flex-shrink-0 border-b border-foreground/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg">Post Details</DialogTitle>
                        <div className="flex items-center gap-2">
                            {canDelete && (
                                <PostActionsDropdown
                                    post={post}
                                    onDelete={handleDelete}
                                />
                            )}
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <X className="h-4 w-4" />
                                </Button>
                            </DialogClose>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1 h-0">
                    <div className="p-4 space-y-4">
                        {/* Post Author */}
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                {post.user?.image ? (
                                    <AvatarImage src={post.user.image} alt={userName} />
                                ) : (
                                    <AvatarFallback>{userInitial}</AvatarFallback>
                                )}
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{userName}</span>
                                    {post.pinned && (
                                        <Badge
                                            variant="outline"
                                            className="flex items-center gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700"
                                        >
                                            <Pin size={12} />
                                            Pinned
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                            </div>
                        </div>

                        {/* Post Content */}
                        <div>
                            <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <Markdown>{post.content}</Markdown>
                            </div>
                        </div>

                        {/* Media Grid - shows all attachments */}
                        {post.metadata?.attachments && post.metadata.attachments.length > 0 && (
                            <MediaGrid 
                                attachments={post.metadata.attachments} 
                                title={post.title} 
                            />
                        )}

                        {/* Video Embed */}
                        {post.metadata?.videoEmbed && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-foreground/10 bg-muted">
                                {post.metadata.videoEmbed.platform === 'youtube' && (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${post.metadata.videoEmbed.videoId}`}
                                        className="absolute inset-0 w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                )}
                                {post.metadata.videoEmbed.platform === 'vimeo' && (
                                    <iframe
                                        src={`https://player.vimeo.com/video/${post.metadata.videoEmbed.videoId}`}
                                        className="absolute inset-0 w-full h-full"
                                        allowFullScreen
                                        allow="autoplay; fullscreen; picture-in-picture"
                                    />
                                )}
                            </div>
                        )}

                        {/* Reactions Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-foreground/5">
                            <div className="flex items-center gap-3">
                                <ReactionBar
                                    reactions={reactions}
                                    currentUserId={currentUserId}
                                    onToggleReaction={handleToggleReaction}
                                    isUpdating={isUpdatingReaction}
                                />
                                <QuickReactions
                                    onSelect={handleToggleReaction}
                                    isUpdating={isUpdatingReaction}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MessageCircle className="h-4 w-4" />
                                <span>{comments.length} comments</span>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="pt-4 border-t border-foreground/5">
                            <h3 className="text-sm font-semibold mb-3">Comments</h3>
                            <CommentList
                                comments={comments}
                                isLoading={isLoadingComments}
                                onReply={handleReply}
                                onLike={likeComment}
                                onDelete={deleteComment}
                                currentUserId={currentUserId}
                                onLoadReplies={loadReplies}
                                loadingRepliesFor={loadingRepliesFor ?? undefined}
                            />
                        </div>
                    </div>
                </ScrollArea>

                {/* Fixed Comment Input */}
                <div className="flex-shrink-0 px-4 pb-4">
                    <CommentInput
                        onSubmit={handleAddComment}
                        replyingTo={replyingTo}
                        onCancelReply={handleCancelReply}
                        isSubmitting={isAddingComment}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Media Grid Component - similar to group chat media grid
function MediaGrid({ attachments, title }: { attachments: any[]; title: string }) {
    const count = attachments.length;

    if (count === 1) {
        return (
            <div className="relative overflow-hidden rounded-lg bg-muted">
                <img
                    src={attachments[0].url}
                    alt={title}
                    className="w-full h-auto max-h-[400px] object-contain"
                />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div className="grid grid-cols-2 gap-2">
                {attachments.map((attachment, idx) => (
                    <div key={attachment.id} className="relative h-52 overflow-hidden rounded-lg bg-muted">
                        <Image
                            src={attachment.url}
                            alt={`${title} - ${idx + 1}`}
                            fill
                            className="object-cover"
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (count === 3) {
        return (
            <div className="grid grid-cols-2 gap-2">
                <div className="relative h-64 overflow-hidden rounded-lg bg-muted col-span-2">
                    <Image
                        src={attachments[0].url}
                        alt={`${title} - 1`}
                        fill
                        className="object-cover"
                    />
                </div>
                {attachments.slice(1).map((attachment, idx) => (
                    <div key={attachment.id} className="relative h-40 overflow-hidden rounded-lg bg-muted">
                        <Image
                            src={attachment.url}
                            alt={`${title} - ${idx + 2}`}
                            fill
                            className="object-cover"
                        />
                    </div>
                ))}
            </div>
        );
    }

    // 4+ images: 2x2 grid with overflow indicator
    return (
        <div className="grid grid-cols-2 gap-2">
            {attachments.slice(0, 4).map((attachment, idx) => (
                <div 
                    key={attachment.id} 
                    className={cn(
                        "relative h-40 overflow-hidden rounded-lg bg-muted",
                        idx === 3 && count > 4 && "relative"
                    )}
                >
                    <Image
                        src={attachment.url}
                        alt={`${title} - ${idx + 1}`}
                        fill
                        className="object-cover"
                    />
                    {idx === 3 && count > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xl font-semibold">+{count - 4}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

