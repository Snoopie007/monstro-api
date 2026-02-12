import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { db } from "@/db/db";
import { chatMembers, chats, groups, groupMembers } from "@subtrees/schemas";
import { auth } from "@/libs/auth/server";
import { Chat } from "@subtrees/types/vendor/social/chat";
import { and, eq, exists, inArray, isNotNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { memo } from "react";
import { GroupChatView } from "./components/GroupChatView";
import { GroupPostsView } from "./components/GroupPostsView";
import { GroupsList } from "./components/GroupsList";
import { GroupsProvider } from "./components/GroupsProvider";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

type GroupsPageProps = {
  params: Promise<{ id: string }>;
};


async function getChatsData(
  locationId: string,
  userId: string
): Promise<{ chats: Chat[]}> {

  const groupsInLocation = await db.query.groups.findMany({
    where: eq(groups.locationId, locationId),
    columns:{
      id: true,
    }
  });

  if (groupsInLocation.length === 0) {
    return { chats: [] };
  }

  const chatsWithGroupId = await db.query.chats.findMany({
    where: and(
      isNotNull(chats.groupId),
      inArray(chats.groupId, groupsInLocation.map((g) => g.id)),
      exists(
        db.select()
          .from(chatMembers)
          .where(and(
            eq(chatMembers.chatId, chats.id),
            eq(chatMembers.userId, userId)
          ))
      )
    ),
    with: {
      group: true,
      chatMembers: {
        with: {
          user: true,
        }
      },
    }
  });

  // Get member counts for all groups
  const groupIds = chatsWithGroupId.map(c => c.groupId).filter(Boolean) as string[];
  const memberCounts = groupIds.length > 0 
    ? await db
        .select({
          groupId: groupMembers.groupId,
          count: sql<number>`count(*)::int`,
        })
        .from(groupMembers)
        .where(inArray(groupMembers.groupId, groupIds))
        .groupBy(groupMembers.groupId)
    : [];

  const memberCountMap = Object.fromEntries(
    memberCounts.map(mc => [mc.groupId, mc.count])
  );

  // Enrich groups with memberCount
  const enrichedChats = chatsWithGroupId.map(chat => ({
    ...chat,
    group: chat.group ? {
      ...chat.group,
      memberCount: memberCountMap[chat.group.id] ?? 0,
      membersPreview: [],
    } : undefined,
  }));

  return { chats: enrichedChats as Chat[] };
}

export default async function GroupsPage(props: GroupsPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await props.params;
  const { chats } = await getChatsData(params.id, session.user.id);

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
                         <div className="flex-1 min-h-0 flex flex-col">
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
