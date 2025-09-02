"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Settings,
  Save,
  FileText,
  Lightbulb,
  User,
  Zap,
  Upload,
  Trash2,
  Plus,
  MessageSquare,
} from "lucide-react";
import { SupportBot } from "@/types/support";
import { TriggersSection } from "./TriggersSection";
import { PersonaSection } from "./PersonaSection";
import { DocumentsSection } from "./DocumentsSection";

interface SupportBotConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  supportBot: SupportBot | null;
  onBotUpdate: (updatedBot: Partial<SupportBot>) => void;
}

export function SupportBotConfigSheet({
  open,
  onOpenChange,
  locationId,
  supportBot,
  onBotUpdate,
}: SupportBotConfigSheetProps) {
  const [editData, setEditData] = useState<Partial<SupportBot>>({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edit data when support bot changes
  useEffect(() => {
    if (supportBot) {
      setEditData({
        name: supportBot.name,
        prompt: supportBot.prompt,
        initialMessage: supportBot.initialMessage,
        temperature: supportBot.temperature,
        model: supportBot.model,
        status: supportBot.status,
      });
      setHasChanges(false);
    } else {
      // Default values for new support bot
      setEditData({
        name: "Support Bot",
        prompt: "You are a helpful customer support assistant.",
        initialMessage:
          "Hi! I'm here to help you. What can I assist you with today?",
        temperature: 0,
        model: "gpt",
        status: "Draft",
      });
      setHasChanges(false);
    }
  }, [supportBot]);

  const handleInputChange = (field: keyof SupportBot, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setLoading(true);
    try {
      await onBotUpdate(editData);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update support bot:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Draft":
        return "bg-yellow-500";
      case "Paused":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings size={20} />
            Support Bot Configuration
          </SheetTitle>
          <SheetDescription>
            Configure your location's support bot settings, triggers, and
            knowledge base.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-1">
                <Settings size={14} />
                General
              </TabsTrigger>
              <TabsTrigger value="triggers" className="flex items-center gap-1">
                <Zap size={14} />
                Triggers
              </TabsTrigger>
              <TabsTrigger value="persona" className="flex items-center gap-1">
                <User size={14} />
                Persona
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="flex items-center gap-1"
              >
                <FileText size={14} />
                Knowledge
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings size={18} />
                    Basic Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bot-name">Bot Name</Label>
                      <Input
                        id="bot-name"
                        value={editData.name || ""}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        placeholder="Enter bot name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bot-status">Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          handleInputChange("status", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${getStatusColor(
                                  "Draft"
                                )}`}
                              />
                              Draft
                            </div>
                          </SelectItem>
                          <SelectItem value="Active">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${getStatusColor(
                                  "Active"
                                )}`}
                              />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="Paused">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${getStatusColor(
                                  "Paused"
                                )}`}
                              />
                              Paused
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ai-model">AI Model</Label>
                    <Select
                      value={editData.model}
                      onValueChange={(value) =>
                        handleInputChange("model", value)
                      }
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="temperature">
                      Temperature: {editData.temperature}
                    </Label>
                    <Slider
                      value={[editData.temperature || 0]}
                      onValueChange={(value) =>
                        handleInputChange("temperature", value[0])
                      }
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Focused</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="initial-message">Initial Message</Label>
                    <Textarea
                      id="initial-message"
                      value={editData.initialMessage || ""}
                      onChange={(e) =>
                        handleInputChange("initialMessage", e.target.value)
                      }
                      placeholder="Enter the bot's greeting message"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bot-prompt">System Prompt</Label>
                    <Textarea
                      id="bot-prompt"
                      value={editData.prompt || ""}
                      onChange={(e) =>
                        handleInputChange("prompt", e.target.value)
                      }
                      placeholder="Enter the bot's system prompt"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || loading}
                      className="gap-2"
                    >
                      <Save size={16} />
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Triggers Tab */}
            <TabsContent value="triggers" className="space-y-4">
              <TriggersSection
                locationId={locationId}
                supportBot={supportBot}
              />
            </TabsContent>

            {/* Persona Tab */}
            <TabsContent value="persona" className="space-y-4">
              <PersonaSection locationId={locationId} supportBot={supportBot} />
            </TabsContent>

            {/* Knowledge Base Tab */}
            <TabsContent value="knowledge" className="space-y-4">
              <DocumentsSection
                locationId={locationId}
                supportBot={supportBot}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
