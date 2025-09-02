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
import * as chatUtils from "./utils/chatUtils";

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

  // Filter available bots using utility function
  const availableBots = chatUtils.filterAvailableBots(bots);

  // Auto-select first active bot if none selected
  useEffect(() => {
    if (!selectedBot && availableBots.length > 0) {
      const bestBot = chatUtils.selectBestBot(availableBots);
      if (bestBot) {
        setSelectedBot(bestBot);
      }
    }
  }, [availableBots, selectedBot, setSelectedBot]);

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
              <SelectTrigger>
                <SelectValue placeholder="Choose a bot to test" />
              </SelectTrigger>
              <SelectContent>
                {availableBots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    <div className="flex items-center gap-2">
                      <BotIcon size={16} />
                      <span>{bot.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-white text-xs ${chatUtils.getBotStatusColor(
                          bot.status
                        )}`}
                      >
                        {bot.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Selection */}
          <ContactSelect />
        </div>

        {/* Selected Bot Info */}
        {selectedBot && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BotIcon size={16} />
              <span className="font-medium">{selectedBot.name}</span>
              <Badge
                variant="outline"
                className={`text-white text-xs ${chatUtils.getBotStatusColor(
                  selectedBot.status
                )}`}
              >
                {selectedBot.status}
              </Badge>
            </div>
            {selectedBot.description && (
              <p className="text-sm text-muted-foreground">
                {selectedBot.description}
              </p>
            )}
          </div>
        )}

        {/* Contact Selection Info */}
        {selectedContact && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm">
              <span className="font-medium">Testing as:</span>{" "}
              {selectedContact.name ||
                selectedContact.phone ||
                selectedContact.email}{" "}
              ({selectedContact.type})
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {selectedBot && (
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
            <div className="flex-1 min-h-0">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>

            {/* Chat Input */}
            <div className="mt-auto">
              <ChatInput />
            </div>
          </>
        )}

        {!selectedBot && availableBots.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BotIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No bots available</p>
              <p className="text-sm">
                Create a bot to start testing conversations.
              </p>
            </div>
          </div>
        )}

        {!selectedBot && availableBots.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BotIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a bot to start</p>
              <p className="text-sm">Choose a bot from the dropdown above.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
