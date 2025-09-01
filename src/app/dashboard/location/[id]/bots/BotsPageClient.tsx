"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Botlist, AIChatBox, BotInfo } from "./components";
import { AIChatProvider } from "./components/Chat/AIChatProvider";
import { ExtendedBot, BotTemplate, AIPersona, Document } from "@/types/bots";
import { Location } from "@/types/location";
import { useBots } from "@/hooks/useBots";

interface BotsPageClientProps {
  locationId: string;
  location: Location;
  templates: BotTemplate[];
  personas: AIPersona[];
  docs: Document[];
}

export function BotsPageClient({
  locationId,
  location,
  templates,
  personas: initialPersonas,
  docs,
}: BotsPageClientProps) {
  const [selectedBot, setSelectedBot] = useState<ExtendedBot | null>(null);
  const [personas, setPersonas] = useState<AIPersona[]>(initialPersonas);

  // Use the custom hook for bot management
  const { bots, loading, createBot, updateBot, deleteBot, refreshBots } =
    useBots(locationId);

  // Function to refresh personas from API
  const refreshPersonas = useCallback(async () => {
    try {
      const response = await fetch(`/api/protected/loc/${locationId}/personas`);
      if (response.ok) {
        const data = await response.json();
        setPersonas(data.personas || []);
      }
    } catch (error) {
      console.error("Failed to refresh personas:", error);
    }
  }, [locationId]);

  // Auto-select first bot when bots are loaded
  useEffect(() => {
    if (!selectedBot && bots.length > 0) {
      setSelectedBot(bots[0]);
    }
  }, [bots, selectedBot]);

  // Update selected bot when it changes in the bots list
  useEffect(() => {
    if (selectedBot && bots.length > 0) {
      const updatedSelectedBot = bots.find(
        (bot: ExtendedBot) => bot.id === selectedBot.id
      );
      if (updatedSelectedBot && updatedSelectedBot !== selectedBot) {
        setSelectedBot(updatedSelectedBot);
      }
    }
  }, [bots, selectedBot]);

  const handleBotSelect = (bot: ExtendedBot) => {
    setSelectedBot(bot);
  };

  const handleBotUpdate = async (updatedBot: ExtendedBot) => {
    const result = await updateBot(updatedBot.id, updatedBot);
    if (result) {
      setSelectedBot(result);
    }
  };

  const handleBotCreate = async (botData: Partial<ExtendedBot>) => {
    const result = await createBot(botData);
    if (result) {
      setSelectedBot(result);
      return result;
    }
    return null;
  };

  const handleBotDelete = async (deletedBotId: string): Promise<void> => {
    const success = await deleteBot(deletedBotId);
    if (success) {
      if (selectedBot?.id === deletedBotId) {
        const remainingBots = bots.filter((bot) => bot.id !== deletedBotId);
        setSelectedBot(remainingBots.length > 0 ? remainingBots[0] : null);
      }
    } else {
      // If deletion failed, throw an error so the calling component can handle it
      throw new Error("Failed to delete bot");
    }
  };

  const handlePersonaCreated = useCallback(
    async (newPersona: AIPersona) => {
      // Refresh personas list to include the newly created persona
      await refreshPersonas();
    },
    [refreshPersonas]
  );

  return (
    <div className="flex flex-row h-[calc(100vh-58px)] p-2 gap-2">
      {/* Left Panel: Bot Management */}
      <div className="flex flex-row gap-2 flex-3/6">
        <Botlist
          lid={locationId}
          templates={templates}
          bots={bots}
          selectedBot={selectedBot}
          onBotSelect={handleBotSelect}
          onBotCreate={handleBotCreate}
          onBotDelete={handleBotDelete}
          loading={loading}
        />
        <BotInfo
          lid={locationId}
          personas={personas}
          docs={docs}
          selectedBot={selectedBot}
          onBotUpdate={handleBotUpdate}
          onPersonaCreated={handlePersonaCreated}
        />
      </div>

      {/* Right Panel: Bot Testing Chat */}
      <div className="flex-3/6">
        <AIChatProvider>
          <AIChatBox location={location} bots={bots} />
        </AIChatProvider>
      </div>
    </div>
  );
}
