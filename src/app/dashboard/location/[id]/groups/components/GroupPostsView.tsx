'use client';

import { ScrollArea } from "@/components/ui";
import { GroupHeader } from "./GroupHeader";
import { useGroups } from "./GroupsProvider";
import { PostsFeed } from "./PostsFeed";

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
        <div className="h-full w-full relative min-h-0">
            <div className="absolute inset-0">
                <ScrollArea className="h-full w-full">
                    <div className="flex min-h-full mx-auto flex-col gap-6 bg-muted/10 p-6">
                        <GroupHeader group={currentChat.group} />
                        <PostsFeed id={lid} gid={currentChat.group.id} groupName={currentChat.group.name} />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

