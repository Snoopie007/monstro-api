"use client";

import React, { useEffect } from "react";
import { useChatContext } from "./AIChatProvider";
import { Bot } from "@/types/bots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, MessageSquare, Bot as BotIcon } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ContactSelect } from "./ContactSelect";
import { NodeFlowTracker } from "./NodeFlowTracker";

interface AIChatBoxProps {
  location: any; // TODO: Replace with proper Location type
  bots: Bot[]; // Real bots data passed from parent
}

export function AIChatBox({ location, bots }: AIChatBoxProps) {
  const {
    selectedBot,
    setSelectedBot,
    selectedContact,
    messages,
    resetChat,
    isLoading,
    currentNode,
    nodeTransitions,
    toolCalls,
    sessionId,
  } = useChatContext();

  // Use the bots passed from parent (already filtered for this location)
  const availableBots = bots.filter(
    (bot) => bot.status === "Active" || bot.status === "Draft"
  );

  // Auto-select first active bot if none selected
  useEffect(() => {
    if (!selectedBot && availableBots.length > 0) {
      const firstActiveBot =
        availableBots.find((bot) => bot.status === "Active") ||
        availableBots[0];
      setSelectedBot(firstActiveBot);
    }
  }, [availableBots, selectedBot, setSelectedBot]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Draft":
        return "bg-yellow-500";
      case "Pause":
        return "bg-orange-500";
      case "Archived":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="h-full flex flex-col border-foreground/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare size={20} />
            Bot Testing Chat
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={resetChat}
            className="gap-2"
            disabled={messages.length === 0}
          >
            <RotateCcw size={16} />
            Reset Chat
          </Button>
        </div>

        {/* Bot Selection */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Bot to Test
            </label>
            <Select
              value={selectedBot?.id || ""}
              onValueChange={(value) => {
                const bot = availableBots.find((b) => b.id === value);
                setSelectedBot(bot || null);
              }}
            >
              <SelectTrigger className="dark:border-foreground/40">
                <SelectValue placeholder="Choose a bot to test">
                  {selectedBot && (
                    <div className="flex items-center gap-2">
                      <span>{selectedBot.name || "Unnamed Bot"}</span>
                      <Badge
                        variant="secondary"
                        className={`text-white text-xs ${getStatusColor(
                          selectedBot.status
                        )}`}
                      >
                        {selectedBot.status}
                      </Badge>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableBots.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <BotIcon size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No bots available</p>
                  </div>
                ) : (
                  availableBots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      <div className="flex items-center gap-2">
                        <span>{bot.name || "Unnamed Bot"}</span>
                        <Badge
                          variant="secondary"
                          className={`text-white text-xs ${getStatusColor(
                            bot.status
                          )}`}
                        >
                          {bot.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Selection */}
          <ContactSelect />

          {/* Bot Info */}
          {selectedBot && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Model:</span>{" "}
                  {selectedBot.model}
                </div>
                <div>
                  <span className="font-medium">Temperature:</span>{" "}
                  {selectedBot.temperature}%
                </div>
              </div>
              {selectedContact && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="font-medium">Testing as:</span>{" "}
                  {selectedContact.firstName} {selectedContact.lastName} (
                  {selectedContact.type})
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {!selectedBot ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground p-6">
            <div>
              <BotIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a bot to start testing</p>
              <p className="text-sm">Choose a bot from the dropdown above</p>
            </div>
          </div>
        ) : (
          <>
            {/* Node Flow Tracker */}
            <div className="px-6 py-2">
              <NodeFlowTracker
                currentNode={currentNode || undefined}
                nodeTransitions={nodeTransitions}
                toolCalls={toolCalls}
                sessionId={sessionId || undefined}
                onResetFlow={resetChat}
                isVisible={selectedBot !== null}
              />
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden px-6">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>

            {/* Chat Input */}
            <div className="border-t dark:border-foreground/10 bg-background px-6 py-4">
              <ChatInput />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
