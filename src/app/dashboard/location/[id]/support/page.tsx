import { SupportPageClient } from "./SupportPageClient";
import { SupportAssistant, SupportConversation, SupportTool } from "@/types";
import { KnowledgeBase } from "@/types/knowledgeBase";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import {
  locations,
  supportAssistants,
  supportConversations,
} from "@/db/schemas";

async function getSupportPageData(id: string) {
  // Get the support assistant with location
  const supportAssistantData = await db.query.supportAssistants.findFirst({
    where: eq(supportAssistants.locationId, id),
    with: {
      location: true,
    },
  });

  // Get conversations for this location
  const conversationsData = await db.query.supportConversations.findMany({
    where: eq(supportConversations.locationId, id),
    with: {
      member: true,
      supportAssistant: true,
    },
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
  });

  // Transform conversations to match the expected type
  const conversations: SupportConversation[] = conversationsData.map(
    (conv) => ({
      ...conv,
      takenOverAt: conv.takenOverAt || undefined,
      isVendorActive: conv.isVendorActive || false,
      title: conv.title || undefined,
      metadata: conv.metadata as Record<string, any>,
    })
  );

  // Transform support assistant to match expected type
  const supportAssistant: SupportAssistant | null = supportAssistantData
    ? {
        ...supportAssistantData,
        availableTools:
          (supportAssistantData.availableTools as SupportTool[]) || [],
        knowledgeBase: supportAssistantData.knowledgeBase as
          | KnowledgeBase
          | undefined,
        persona: supportAssistantData.persona as Record<string, any>,
        model: supportAssistantData.model as "anthropic" | "gpt" | "gemini",
        status: supportAssistantData.status as "Draft" | "Active" | "Paused",
      }
    : null;

  return {
    location: supportAssistantData?.location,
    supportAssistant,
    conversations,
  };
}

export default async function SupportPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  try {
    const { location, supportAssistant, conversations } =
      await getSupportPageData(params.id);

    // Handle case where support assistant doesn't exist
    if (!location) {
      throw new Error("Location not found");
    }

    return (
      <SupportPageClient
        locationId={params.id}
        location={location}
        conversations={conversations}
        supportAssistant={supportAssistant}
      />
    );
  } catch (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-58px)]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Location not found
          </h2>
          <p className="text-muted-foreground">
            The requested location could not be found.
          </p>
        </div>
      </div>
    );
  }
}
