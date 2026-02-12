"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/libs/utils";
import { MessageCircle, Pin, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { GroupPost } from "@subtrees/types/vendor/social";
import Markdown from "react-markdown";
import { ReactionBar, QuickReactions } from "./reactions";
import { useReactions } from "@/hooks/useReactions";
import { useSession } from "@/hooks/useSession";
import { PostActionsDropdown } from "./PostActionsDropdown";

type PostCardProps = {
  post: GroupPost;
  onOpenDetail?: (post: GroupPost) => void;
  onDelete?: (post: GroupPost) => void;
  canDelete?: boolean;
};

export function PostCard({ post, onOpenDetail, onDelete, canDelete = false }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created), {
    addSuffix: true,
  });

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const {
    reactions,
    toggleReaction,
    isUpdating,
  } = useReactions({
    ownerType: "post",
    ownerId: post.id,
    initialData: post.reactions,  // Use pre-fetched reactions
  });

  const handleToggleReaction = (emoji: { value: string; name: string; type: string }) => {
    toggleReaction(emoji);
  };

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(post);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post);
    }
  };

  return (
    <Card
      className={cn(
        "group border-foreground/10 bg-card/80 cursor-pointer transition-shadow hover:shadow-md",
        post.pinned && "ring-1 ring-amber-200/60"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-12 w-12">
          {post.user?.image ? (
            <AvatarImage src={post.user.image} alt={post.user?.name ?? "User"} />
          ) : (
            <AvatarFallback>{post.user?.name?.[0] ?? "U"}</AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-tight">{post.user?.name ?? "Unknown"}</p>
            {post.pinned && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700"
              >
                <Pin size={14} />
                Pinned
              </Badge>
            )}
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {timeAgo}
          </p>
        </div>

        {/* Actions dropdown - only show for users who can delete */}
        {canDelete && (
          <div className="flex-shrink-0">
            <PostActionsDropdown
              post={post}
              onDelete={handleDelete}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex gap-4">
          {/* Text content on the left */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold tracking-tight">{post.title}</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-2 text-muted-foreground">
              <Markdown>{post.content}</Markdown>
            </div>
          </div>

          {/* Square image thumbnail on the right - Skool style */}
          {post.metadata?.mediaUrl && (
            <div className="relative flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg bg-muted">
              <img
                src={post.metadata.mediaUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              {/* Show image count badge if multiple images */}
              {post.metadata?.attachments && post.metadata.attachments.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  +{post.metadata.attachments.length - 1}
                </div>
              )}
            </div>
          )}

          {/* Video thumbnail on the right - for video embed posts */}
          {!post.metadata?.mediaUrl && post.metadata?.videoEmbed && (
            <div className="relative flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg bg-muted">
              {post.metadata.videoEmbed.platform === 'youtube' && (
                <img
                  src={`https://img.youtube.com/vi/${post.metadata.videoEmbed.videoId}/hqdefault.jpg`}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              )}
              {post.metadata.videoEmbed.platform === 'vimeo' && (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Vimeo</span>
                </div>
              )}
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter
        className="flex flex-wrap items-center justify-start gap-4 pt-4 text-sm text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <ReactionBar
            reactions={reactions}
            currentUserId={currentUserId}
            onToggleReaction={handleToggleReaction}
            isUpdating={isUpdating}
            size="sm"
          />
          <QuickReactions
            onSelect={handleToggleReaction}
            isUpdating={isUpdating}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 rounded-full"
          onClick={handleCardClick}
        >
          <MessageCircle size={16} />
          {post.commentCounts ?? 0} comments
        </Button>
      </CardFooter>
    </Card>
  );
}


