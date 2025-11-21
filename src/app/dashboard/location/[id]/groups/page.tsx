import { db } from "@/db/db";
import { chats, groups } from "@/db/schemas";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { GroupsList } from "./components/GroupsList";
import { GroupChatView } from "./components/GroupChatView";
import { Chat } from "@/types/chats";
import { GroupsProvider } from "./components/GroupsProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { GroupPostsView } from "./components/GroupPostsView";
import { memo } from "react";

type GroupsPageProps = {
  params: Promise<{ id: string }>;
};


async function getChatsData(
  locationId: string
): Promise<{ chats: Chat[]}> {

  const groupsInLocation = await db.query.groups.findMany({
    where: eq(groups.locationId, locationId),
    columns:{
      id: true,
    }
  });

  const chatsWithGroupId = await db.query.chats.findMany({
    where: and(isNotNull(chats.groupId), inArray(chats.groupId, groupsInLocation.map((g) => g.id))),
    with: {
      group: true,
      chatMembers: true,
    }
  });
  return { chats: chatsWithGroupId as Chat[] };
}

export default async function GroupsPage(props: GroupsPageProps) {
  const params = await props.params;
  const { chats } = await getChatsData(params.id);

  return (
    <div className="w-full h-full pb-2 pr-2">
        <GroupsProvider chats={chats}>
            <div className="flex flex-row h-full transition-all duration-300 ease-in-out gap-2">
                <div className="flex-none w-[25%] h-full">
                    <GroupsList lid={params.id} />
                </div>
                <div className="flex-1 h-full min-w-0">
                    <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
                        <div className="flex-none pb-2">
                             <TabsList className="bg-transparent rounded-none p-0 justify-start gap-1 flex-shrink-0">
                                <TabsTrigger value="chat" className="bg-foreground/5 text-xs capitalize rounded-full">Chat</TabsTrigger>
                                <TabsTrigger value="posts" className="bg-foreground/5 text-xs capitalize rounded-full">Posts</TabsTrigger>
                            </TabsList>
                        </div>
                         <div className="flex-1 min-h-0">
                            <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex flex-col">
                                <GroupChatMemo lid={params.id} />
                            </TabsContent>
                            <TabsContent value="posts" className="h-full m-0 data-[state=active]:flex flex-col">
                                <GroupPostsMemo lid={params.id} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
          </GroupsProvider>
    </div>
  )
}

const GroupChatMemo = memo(GroupChatView);
const GroupPostsMemo = memo(GroupPostsView);
