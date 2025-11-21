'use client';

import { useGroups } from "./GroupsProvider";
import { GroupHeader } from "./GroupHeader";
import { PostsFeed } from "./PostsFeed";
import { ScrollArea } from "@/components/ui";

export function GroupPostsView({ lid }: { lid: string }) {
    const { currentChat } = useGroups();

    if (!currentChat || !currentChat.group) {
        return (
            <div className="h-full flex items-center justify-center text-center px-4">
                <div className="space-y-2">
                    <span className="text-sm text-muted-foreground block">
                        Select a group to view posts.
                    </span>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full w-full">
            <div className="flex h-full mx-auto flex-col gap-6 bg-muted/10 p-6">
                <GroupHeader group={currentChat.group} />
                <PostsFeed id={lid} gid={currentChat.group.id} />
            </div>
        </ScrollArea>
    );
}

