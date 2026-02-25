'use client'
import { Input } from "@/components/forms"
import { Avatar, AvatarFallback, ScrollArea } from "@/components/ui"
import { useSession } from "@/hooks/useSession"
import { useState } from "react"
import { useGroups } from "./GroupsProvider"
import { Chat } from "@subtrees/types/chat"
import { CreateGroupModal } from "./CreateGroupModal"
import { Plus } from "lucide-react"
export function GroupsList({ lid }: { lid: string }) {
    const [search, setSearch] = useState<string>('')
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;
    const { chats } = useGroups();

    return (
        <div className="flex flex-col bg-muted/50 rounded-lg h-full min-h-0">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="text-base font-bold">Groups</div>
                {chats.length > 0 && (
                    <CreateGroupModal
                        trigger={
                            <button type="button" className="p-1 rounded-md hover:bg-foreground/10 transition-colors">
                                <Plus className="size-5 text-muted-foreground hover:text-foreground" />
                            </button>
                        }
                    />
                )}
            </div>

            <div className="flex flex-col flex-1 min-h-0 space-y-2">
                <div className="space-y-4 px-2">
                    <Input
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="rounded-lg w-full bg-foreground/5 border-none"
                    />
                </div>
                {/* {isLoading && (
                    <div className="flex flex-col gap-2 p-2">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                )} */}

                <ScrollArea className="flex-1 h-0 w-full px-2">
                        {chats.length === 0 ? (
                            <div className="text-center pt-8 text-muted-foreground">
                                <p>Your Community doesn't have any groups yet</p>
                                <CreateGroupModal />
                            </div>
                        ) : (
                                <div className="space-y-2">
                                    {chats.map((chat) => (
                                    <GroupItem key={chat.id} chat={chat} currentUserId={currentUserId} />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
            </div>
        </div>
    );
}

function GroupItem({ chat, currentUserId }: { chat: Chat; currentUserId?: string }) {
    const { setCurrentChat } = useGroups();
    const unreadCount = currentUserId
        ? (chat.chatMembers?.find(member => member.userId === currentUserId)?.unreadCount ?? 0)
        : 0;
    const hasUnread = unreadCount > 0;

    return (
        <button
            type="button"
            className="cursor-pointer w-full text-left"
            onClick={() => {
                setCurrentChat(chat);
            }}
        >
            <div
                className={`flex flex-row flex-1 justify-between items-center rounded-lg p-2 transition-colors ${
                    hasUnread
                        ? 'bg-accent/60 hover:bg-accent/70 border border-accent/70'
                        : 'hover:bg-accent/50 border border-transparent'
                }`}
            >
                <Avatar className="size-6 mr-4">
                    <AvatarFallback>
                        {chat.group?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-0 w-full">
                    <div className="text-sm  flex flex-row gap-2 justify-between items-center w-full">
                        <span className={`flex flex-row gap-1 items-center justify-between w-full ${hasUnread ? 'font-semibold text-foreground' : 'font-medium'}`}>
                            <div className="flex flex-row gap-1 items-center">
                                <span>
                                    {chat.name ?? chat.group?.name}
                                </span>
                            </div>
                        </span>
                    </div>
                    <div className={`text-[0.7rem] flex flex-row gap-2 justify-between items-center ${hasUnread ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                        <div className="flex flex-row gap-1 items-center">
                            <span>{chat.group?.description || 'No description'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasUnread && (
                                <span
                                    className="inline-flex h-2.5 w-2.5 rounded-full bg-orange-500"
                                    title="Unread messages"
                                />
                            )}
                            <span className={hasUnread ? 'font-medium text-foreground/80' : 'text-muted-foreground'}>
                                {chat.group?.created.toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    )
}
