"use client";

import React, { useState } from "react";
import { Bot, ExtendedBot, AIPersona, Document } from "@/types/bots";
import { updateMockBot, MOCK_BOT_SCENARIOS } from "@/mocks/bots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Settings, FileText, Lightbulb, Save, Workflow } from "lucide-react";
import Link from "next/link";
import { NewScenario } from "./Settings/Scenario/NewScenario";
import { ScenarioComp } from "./Settings/Scenario/ScenarioComp";
import { PersonaComponent } from "./Settings/Persona";

interface BotInfoProps {
  lid: string;
  personas: AIPersona[];
  docs: Document[];
}

export function BotInfo({ lid, personas, docs }: BotInfoProps) {
  const [selectedBot, setSelectedBot] = useState<ExtendedBot | null>(null);
  const [editData, setEditData] = useState<Partial<ExtendedBot>>({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // TODO: This should come from a global state or context
  // For now, we'll use a mock selected bot
  React.useEffect(() => {
    // Mock selected bot - in real app this would come from Botlist selection
    const mockBot: Bot = {
      id: "bot-1",
      locationId: lid,
      name: "Front Desk Helper",
      initialMessage:
        "Hi! I'm here to help with any questions about our facility, hours, or services. What would you like to know?",
      prompt:
        "You are a helpful front desk assistant for a fitness center. Answer questions about facilities, hours, membership, and general information. Be professional but friendly.",
      objectives: [],
      temperature: 50,
      model: "gpt",
      invalidNodes: [],
      status: "Active",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-25"),
    };
    setSelectedBot(mockBot);
    setEditData(mockBot);
  }, [lid]);

  const handleFieldChange = (field: keyof Bot, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedBot || !hasChanges) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/protected/loc/${lid}/bots/${selectedBot.id}`, {
      //     method: 'PUT',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(editData)
      // });
      // const updatedBot = await response.json();

      // Using mock function for now
      const updatedBot = await updateMockBot(selectedBot.id, editData);

      setSelectedBot(updatedBot);
      setEditData(updatedBot);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update bot:", error);
    } finally {
      setLoading(false);
    }
  };

  const scenarios = MOCK_BOT_SCENARIOS.filter(
    (s) => s.botId === selectedBot?.id
  );

  if (!selectedBot) {
    return (
      <Card className="flex-1 h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p>Select a bot to configure settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 h-full border-foreground/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Bot Configuration
          </CardTitle>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
            size="sm"
            className="gap-2"
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure {selectedBot.name || "Unnamed Bot"}
        </p>
      </CardHeader>

      <CardContent className="h-[calc(100%-120px)]">
        <Tabs defaultValue="settings" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings" className="gap-2">
              <Settings size={16} />
              Settings
            </TabsTrigger>
            <TabsTrigger value="flow" className="gap-2">
              <Workflow size={16} />
              Flow Builder
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <Lightbulb size={16} />
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <FileText size={16} />
              Knowledge
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-48px)] mt-4">
            <TabsContent value="settings" className="space-y-4 mt-0">
              <div className="space-y-4">
                {/* AI Persona Section */}
                <PersonaComponent
                  personas={personas}
                  selectedBot={selectedBot}
                  onBotUpdate={(updatedBot) => {
                    setSelectedBot(updatedBot);
                    setEditData(updatedBot);
                  }}
                  locationId={lid}
                />
                <div>
                  <Label htmlFor="bot-name">Bot Name</Label>
                  <Input
                    id="bot-name"
                    className="dark:border-foreground/40"
                    value={editData.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Enter bot name"
                  />
                </div>

                <div>
                  <Label htmlFor="initial-message">Initial Message</Label>
                  <Textarea
                    id="initial-message"
                    className="dark:border-foreground/40"
                    value={editData.initialMessage || ""}
                    onChange={(e) =>
                      handleFieldChange("initialMessage", e.target.value)
                    }
                    placeholder="What should the bot say first?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="bot-prompt">System Prompt</Label>
                  <Textarea
                    id="bot-prompt"
                    className="dark:border-foreground/40"
                    value={editData.prompt || ""}
                    onChange={(e) =>
                      handleFieldChange("prompt", e.target.value)
                    }
                    placeholder="Describe how the bot should behave..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-model">AI Model</Label>
                    <Select
                      value={editData.model}
                      onValueChange={(value) =>
                        handleFieldChange("model", value)
                      }
                    >
                      <SelectTrigger className="dark:border-foreground/40">
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt">GPT-4</SelectItem>
                        <SelectItem value="anthropic">Claude</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bot-status">Status</Label>
                    <Select
                      value={editData.status}
                      onValueChange={(value) =>
                        handleFieldChange("status", value)
                      }
                    >
                      <SelectTrigger className="dark:border-foreground/40">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Pause">Paused</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="temperature">
                    Temperature (Creativity): {editData.temperature || 50}%
                  </Label>
                  <Slider
                    id="temperature"
                    min={0}
                    max={100}
                    step={10}
                    value={[editData.temperature || 50]}
                    onValueChange={([value]) =>
                      handleFieldChange("temperature", value)
                    }
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>More Focused</span>
                    <span>More Creative</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flow" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Workflow className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Visual Flow Builder
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Create sophisticated conversation flows using our visual
                    node editor. Design branching logic, data extraction, and
                    complex bot behaviors.
                  </p>

                  {selectedBot ? (
                    <div className="space-y-3 max-w-sm mx-auto">
                      <div className="flex items-center justify-between p-3 border rounded-lg text-left">
                        <div>
                          <div className="font-medium text-sm">
                            {selectedBot.name || "Untitled Bot"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedBot.objectives?.length || 0} nodes
                            configured
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/location/${lid}/bots/builder/${selectedBot.id}`}
                        >
                          <Button size="sm">
                            <Workflow size={14} className="mr-1" />
                            Open Builder
                          </Button>
                        </Link>
                      </div>

                      {selectedBot.invalidNodes &&
                        selectedBot.invalidNodes.length > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-xs text-red-800">
                              <strong>⚠️ Flow Issues:</strong>{" "}
                              {selectedBot.invalidNodes.length} invalid nodes
                              detected. Open the builder to fix these issues.
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Select a bot to configure its flow
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Bot Scenarios</h3>
                  <p className="text-sm text-muted-foreground">
                    Define triggers that activate specific bot behaviors
                  </p>
                </div>
                <NewScenario botId={selectedBot.id} />
              </div>

              <div className="space-y-3">
                {scenarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No scenarios created yet</p>
                    <p className="text-sm">
                      Create scenarios to customize bot responses
                    </p>
                  </div>
                ) : (
                  scenarios.map((scenario) => (
                    <ScenarioComp key={scenario.id} scenario={scenario} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">
                    Documents and data sources for this bot
                  </p>
                </div>
                <Button size="sm" disabled>
                  {/* TODO: Implement file upload */}
                  Upload Document
                </Button>
              </div>

              <div className="space-y-3">
                {docs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded yet</p>
                    <p className="text-sm">
                      Upload PDFs or add websites to train your bot
                    </p>
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border dark:border-foreground/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type === "file"
                              ? `${(doc.size || 0 / 1024 / 1024).toFixed(1)} MB`
                              : "Website"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
