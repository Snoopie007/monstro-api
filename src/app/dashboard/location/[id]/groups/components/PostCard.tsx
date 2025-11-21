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
import {
  Bookmark,
  MessageCircle,
  Pin,
  Share2,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { GroupPost } from "@/types/groups";
import Markdown from "react-markdown";

type PostCardProps = {
  post: GroupPost;
};

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created), {
    addSuffix: true,
  });

  return (
    <Card
      className={cn(
        "border-foreground/10 bg-card/80",
        post.pinned && "ring-1 ring-amber-200/60"
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-12 w-12">
          {post.user.image ? (
            <AvatarImage src={post.user.image} alt={post.user.name} />
          ) : (
            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-tight">{post.user.name}</p>
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
        {/* 
          <Button variant="ghost" size="sm" className="rounded-full text-xs">
            Add Friend
          </Button>
        */}
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          {post.mediaUrl && (
            <div className="relative w-fit overflow-hidden rounded-xl bg-muted">
              <img
                src={post.mediaUrl}
                alt={post.title}
                className="max-h-[500px] w-auto max-w-full object-contain transition duration-300 hover:scale-105"
              />
            </div>
          )}
          <h3 className="text-lg font-semibold tracking-tight pt-2">{post.title}</h3>
          <Markdown>{post.content}</Markdown>
        </div>

        {post.attachments && post.attachments.length > 0 && (
          <div
            className={cn(
              "grid gap-3",
              post.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {post.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative h-48 overflow-hidden rounded-xl bg-muted"
              >
                <Image
                  src={attachment.url}
                  alt={post.title}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-4 pt-4 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 rounded-full"
        >
          <ThumbsUp size={16} />
          {post.metadata?.likes} · React
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 rounded-fsull"
        >
          <MessageCircle size={16} />
          {post.metadata?.comments} comments
        </Button>
      </CardFooter>
    </Card>
  );
}


