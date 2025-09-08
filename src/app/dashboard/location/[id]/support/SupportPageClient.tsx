"use client";

import React, { useState, useEffect } from "react";
import { SupportInbox } from "./components/SupportInbox";
import { AdminTestChat } from "./components/AdminTestChat";
import { ConversationView } from "./components/ConversationView";
import { SupportAssistantConfigSheet } from "./components/SupportBotConfigSheet";
import { toast } from "react-toastify";
import { Location } from "@/types/location";
import { SupportAssistant } from "@/types/supportBot";
import { SupportConversation } from "@/types/supportConversations";

interface SupportPageClientProps {
  locationId: string;
  location: Location;
  supportAssistant: SupportAssistant | null;
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
  supportAssistant: initialSupportAssistant,
  conversations: initialConversations,
}: SupportPageClientProps) {
  const [supportAssistant, setSupportAssistant] = useState<SupportAssistant | null>(
    initialSupportAssistant
  );
  const [conversations, setConversations] =
    useState<SupportConversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] =
    useState<SelectedConversation>({
      type: "admin-test",
      id: "admin-test",
    });
  const [configSheetOpen, setConfigSheetOpen] = useState(false);

  // Load support bot (with auto-creation if needed)
  useEffect(() => {
    const loadSupportBot = async () => {
      if (!supportAssistant) {
        try {
          const response = await fetch(
            `/api/protected/loc/${locationId}/support`
          );

          if (response.ok) {
            const data = await response.json();
            setSupportAssistant(data.supportAssistant);
          } else {
            console.error(
              "Failed to load/create support bot:",
              response.statusText
            );
          }
        } catch (error) {
          console.error("Failed to load/create support bot:", error);
        }
      }
    };

    loadSupportBot();
  }, [locationId]);

  const handleConversationSelect = (conversation: SelectedConversation) => {
    setSelectedConversation(conversation);
  };

  const handleBotConfigUpdate = async (updatedBot: Partial<SupportAssistant>) => {
    try {
      const response = await fetch(`/api/protected/loc/${locationId}/support`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedBot),
      });

      if (response.ok) {
        const data = await response.json();
        setSupportAssistant(data.supportAssistant);

        // Show success message

        toast.success(data.message || "Support bot updated successfully");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update support bot");
      }
    } catch (error) {
      console.error("Failed to update support bot:", error);
      toast.error("Failed to update support bot. Please try again.");
    }
  };

  const renderConversationContent = () => {
    switch (selectedConversation.type) {
      case "admin-test":
        return (
          <AdminTestChat
            locationId={locationId}
            supportBot={supportAssistant}
            onBotUpdate={handleBotConfigUpdate}
          />
        );
      case "member-conversation":
        return (
          <ConversationView
            locationId={locationId}
            conversation={selectedConversation.data}
            supportBot={supportAssistant}
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
      <SupportAssistantConfigSheet
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        locationId={locationId}
        supportAssistant={supportAssistant}
        onAssistantUpdate={handleBotConfigUpdate}
      />
    </>
  );
}
