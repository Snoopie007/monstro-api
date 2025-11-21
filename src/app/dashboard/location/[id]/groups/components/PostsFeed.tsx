"use client";

import { Button, Card, CardContent, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from "@/components/ui";
import { Filter, Loader2, Pencil } from "lucide-react";
import { PostCard } from "./PostCard";
import { GroupPost } from "@/types/groups";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";

export function PostsFeed({ id, gid }: { id: string, gid: string }) {
  const { posts, error, isLoading } = useCommunityPosts({ id, gid });
  const hasPosts = posts?.length > 0;

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
          <Button variant="primary" size="sm" className="gap-2 rounded-full">
            <Pencil size={16} />
            Create post
          </Button>
        </div>
      </header>

      {isLoading ? (
        <LoadingState />
      ) : hasPosts ? (
        <div className="space-y-4">
          {posts.map((post: GroupPost) => (
            <PostCard key={post.id} post={post} />
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
          <Button variant="primary" className="rounded-full">
            Create the first post
          </Button>
        </Empty>
      )}
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


