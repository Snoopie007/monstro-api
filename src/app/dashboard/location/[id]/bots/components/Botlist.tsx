"use client";

import React, { useState, useEffect } from "react";
import { Bot, BotTemplate } from "@/types/bots";
import { MOCK_BOTS, createMockBot, deleteMockBot } from "@/mocks/bots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bot as BotIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BotlistProps {
  lid: string;
  templates: BotTemplate[];
}

export function Botlist({ lid, templates }: BotlistProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBotData, setNewBotData] = useState({
    name: "",
    template: "",
    model: "gpt" as const,
  });

  // Load bots for this location
  useEffect(() => {
    // TODO: Replace with actual API call
    // const loadBots = async () => {
    //     const response = await fetch(`/api/protected/loc/${lid}/bots`);
    //     const data = await response.json();
    //     setBots(data.bots);
    // };
    // loadBots();

    // Using mock data for now
    const locationBots = MOCK_BOTS.filter(
      (bot) => bot.locationId === lid || bot.locationId === "loc-1"
    );
    setBots(locationBots);
    if (locationBots.length > 0) {
      setSelectedBot(locationBots[0]);
    }
  }, [lid]);

  const handleCreateBot = async () => {
    if (!newBotData.name) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/protected/loc/${lid}/bots`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(newBotData)
      // });
      // const newBot = await response.json();

      // Using mock function for now
      const template = templates.find((t) => t.id === newBotData.template);
      const newBot = await createMockBot(lid, {
        name: newBotData.name,
        prompt: template?.prompt || "",
        model: newBotData.model,
        initialMessage: template?.initialMessage || null,
        objectives: template?.objectives || [],
      });

      setBots((prev) => [...prev, newBot]);
      setSelectedBot(newBot);
      setCreateDialogOpen(false);
      setNewBotData({ name: "", template: "", model: "gpt" });
    } catch (error) {
      console.error("Failed to create bot:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/protected/loc/${lid}/bots/${botToDelete.id}`, {
      //     method: 'DELETE'
      // });

      // Using mock function for now
      await deleteMockBot(botToDelete.id);

      setBots((prev) => prev.filter((bot) => bot.id !== botToDelete.id));
      if (selectedBot?.id === botToDelete.id) {
        setSelectedBot(bots.length > 1 ? bots[0] : null);
      }
      setDeleteDialogOpen(false);
      setBotToDelete(null);
    } catch (error) {
      console.error("Failed to delete bot:", error);
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
      case "Pause":
        return "bg-orange-500";
      case "Archived":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-80 h-full border-foreground/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Bots</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={16} />
                Create Bot
              </Button>
            </DialogTrigger>
            <DialogContent className="p-4">
              <DialogHeader>
                <DialogTitle>Create New Bot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bot-name">Bot Name</Label>
                  <Input
                    id="bot-name"
                    value={newBotData.name}
                    onChange={(e) =>
                      setNewBotData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter bot name"
                  />
                </div>
                <div>
                  <Label htmlFor="bot-template">Template (Optional)</Label>
                  <Select
                    onValueChange={(value) =>
                      setNewBotData((prev) => ({ ...prev, template: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bot-model">AI Model</Label>
                  <Select
                    onValueChange={(value) =>
                      setNewBotData((prev) => ({
                        ...prev,
                        model: value as any,
                      }))
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
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBot}
                    disabled={!newBotData.name || loading}
                  >
                    {loading ? "Creating..." : "Create Bot"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto">
        {bots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BotIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>No bots created yet</p>
            <p className="text-sm">Create your first bot to get started</p>
          </div>
        ) : (
          bots.map((bot) => (
            <div
              key={bot.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedBot?.id === bot.id
                  ? "border-foreground/50 bg-primary/5"
                  : "border-foreground/10 hover:bg-muted/50"
              }`}
              onClick={() => setSelectedBot(bot)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm truncate">
                  {bot.name || "Unnamed Bot"}
                </h3>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className={`text-white text-xs ${getStatusColor(
                      bot.status
                    )}`}
                  >
                    {bot.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBotToDelete(bot);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Model: {bot.model}</p>
                <p>Updated: {bot.updatedAt?.toLocaleDateString() || "Never"}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{botToDelete?.name}"? This action
              cannot be undone. All conversations, scenarios, and settings for
              this bot will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
