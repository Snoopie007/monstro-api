"use client";

import React, { useState, useEffect } from "react";
import { SupportInbox } from "./components/SupportInbox";
import { AdminTestChat } from "./components/AdminTestChat";
import { ConversationView } from "./components/ConversationView";
import { SupportBotConfigSheet } from "./components/SupportBotConfigSheet";
import { Location } from "@/types/location";
import { SupportBot, SupportConversation } from "@/types/support";

interface SupportPageClientProps {
  locationId: string;
  location: Location;
  supportBot: SupportBot | null;
  conversations: SupportConversation[];
}

type ConversationType = "admin-test" | "member-conversation";

interface SelectedConversation {
  type: ConversationType;
  id: string;
  data?: SupportConversation;
}

export function SupportPageClient({
  locationId,
  location,
  supportBot: initialSupportBot,
  conversations: initialConversations,
}: SupportPageClientProps) {
  const [supportBot, setSupportBot] = useState<SupportBot | null>(
    initialSupportBot
  );
  const [conversations, setConversations] =
    useState<SupportConversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] =
    useState<SelectedConversation>({
      type: "admin-test",
      id: "admin-test",
    });
  const [configSheetOpen, setConfigSheetOpen] = useState(false);

  // Auto-create support bot if it doesn't exist
  useEffect(() => {
    const createSupportBotIfNeeded = async () => {
      if (!supportBot) {
        try {
          // TODO: Implement auto-creation of support bot
          // const newSupportBot = await createSupportBot(locationId);
          // setSupportBot(newSupportBot);
          console.log("TODO: Auto-create support bot for location", locationId);
        } catch (error) {
          console.error("Failed to create support bot:", error);
        }
      }
    };

    createSupportBotIfNeeded();
  }, [locationId, supportBot]);

  const handleConversationSelect = (conversation: SelectedConversation) => {
    setSelectedConversation(conversation);
  };

  const handleBotConfigUpdate = async (updatedBot: Partial<SupportBot>) => {
    try {
      // TODO: Implement support bot update API call
      // const updated = await updateSupportBot(locationId, updatedBot);
      // setSupportBot(updated);
      console.log("TODO: Update support bot:", updatedBot);
    } catch (error) {
      console.error("Failed to update support bot:", error);
    }
  };

  const renderConversationContent = () => {
    switch (selectedConversation.type) {
      case "admin-test":
        return (
          <AdminTestChat
            locationId={locationId}
            supportBot={supportBot}
            onBotUpdate={handleBotConfigUpdate}
          />
        );
      case "member-conversation":
        return (
          <ConversationView
            locationId={locationId}
            conversation={selectedConversation.data}
            supportBot={supportBot}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Select a conversation to start
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex flex-row h-[calc(100vh-58px)] p-2 gap-2">
        {/* Left Panel: Inbox */}
        <div className="w-80">
          <SupportInbox
            locationId={locationId}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={handleConversationSelect}
            onConfigureBot={() => setConfigSheetOpen(true)}
          />
        </div>

        {/* Right Panel: Conversation View */}
        <div className="flex-1">{renderConversationContent()}</div>
      </div>

      {/* Support Bot Configuration Sheet */}
      <SupportBotConfigSheet
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        locationId={locationId}
        supportBot={supportBot}
        onBotUpdate={handleBotConfigUpdate}
      />
    </>
  );
}
