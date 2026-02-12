'use client'
import { Input } from "@/components/forms"
import { Avatar, AvatarFallback, ScrollArea } from "@/components/ui"
import { useState } from "react"
import { useGroups } from "./GroupsProvider"
import { Chat } from "@subtrees/types/vendor/social/chat"
import { CreateGroupModal } from "./CreateGroupModal"
import { Plus } from "lucide-react"
export function GroupsList({ lid }: { lid: string }) {
    const [search, setSearch] = useState<string>('')
    const { chats } = useGroups();

    return (
        <div className="flex flex-col bg-muted/50 rounded-lg h-full min-h-0">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="text-base font-bold">Groups</div>
                {chats.length > 0 && (
                    <CreateGroupModal
                        trigger={
                            <button className="p-1 rounded-md hover:bg-foreground/10 transition-colors">
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
                                    <GroupItem key={chat.id} chat={chat} />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
            </div>
        </div>
    );
}

function GroupItem({ chat }: { chat: Chat }) {
    const { setCurrentChat } = useGroups();
    return (
        <li
            key={chat.id}
            className="cursor-pointer"
            onClick={() => {
                setCurrentChat(chat);
            }}
        >
            <div className="flex flex-row flex-1 justify-between items-center hover:bg-accent/50 rounded-lg p-2">
                <Avatar className="size-6 mr-4">
                    <AvatarFallback>
                        {chat.group?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-0 w-full">
                    <div className="text-sm  flex flex-row gap-2 justify-between items-center w-full">
                        <span className="font-medium flex flex-row gap-1 items-center justify-between w-full">
                            <div className="flex flex-row gap-1 items-center">
                                <span>
                                    {chat.name ?? chat.group?.name}
                                </span>
                            </div>
                        </span>
                    </div>
                    <div className="text-[0.7rem] text-muted-foreground flex flex-row gap-2 justify-between items-center">
                        <div className="flex flex-row gap-1 items-center">
                            <span>{chat.group?.description || 'No description'}</span>
                        </div>
                        <span className=" text-muted-foreground">
                            {chat.group?.created.toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </li>
    )
}