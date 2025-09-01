"use client";

import React, { useState } from "react";
import { Bot, BotTemplate } from "@/types/bots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bot as BotIcon, Loader2 } from "lucide-react";
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
import { toast } from "react-toastify";
import { z } from "zod";

// Helper function to safely format dates
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "Never";

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Never";
  }
};

// Zod validation schema for bot creation
const createBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  prompt: z.string().min(1, "Prompt is required"),
  temperature: z.number().min(0).max(100).default(0),
  initialMessage: z.string().optional(),
  model: z.enum(["anthropic", "gpt", "gemini"]).default("gpt"),
  objectives: z.array(z.any()).default([]),
  invalidNodes: z.array(z.string()).default([]),
  status: z.enum(["Draft", "Active", "Pause", "Archived"]).default("Draft"),
});

interface BotlistProps {
  lid: string;
  templates: BotTemplate[];
  bots: Bot[];
  selectedBot: Bot | null;
  onBotSelect: (bot: Bot) => void;
  onBotCreate: (botData: Partial<Bot>) => Promise<Bot | null>;
  onBotDelete: (deletedBotId: string) => void;
  loading: boolean;
}

export function Botlist({
  lid,
  templates,
  bots,
  selectedBot,
  onBotSelect,
  onBotCreate,
  onBotDelete,
  loading,
}: BotlistProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBotData, setNewBotData] = useState({
    name: "",
    template: "",
    model: "gpt" as const,
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [creatingBot, setCreatingBot] = useState(false);

  const handleCreateBot = async () => {
    // Prevent double submission
    if (creatingBot) return;

    // Clear previous validation errors
    setValidationErrors({});
    setCreatingBot(true);

    try {
      // Prepare bot data
      const template = templates.find((t) => t.id === newBotData.template);
      const botData = {
        name: newBotData.name,
        prompt: template?.prompt || "You are a helpful AI assistant.",
        temperature: 0,
        initialMessage: template?.initialMessage || null,
        model: newBotData.model,
        objectives: template?.objectives || [],
        invalidNodes: template?.invalidNodes || [],
        status: "Draft" as const,
      };

      // Validate the data
      const validationResult = createBotSchema.safeParse(botData);
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach((issue) => {
          errors[issue.path[0] as string] = issue.message;
        });
        setValidationErrors(errors);
        return;
      }

      // Use the callback provided by parent component instead of direct API call
      // The parent component will handle the API call through useBots hook
      const newBot = await onBotCreate(botData as any);

      if (newBot) {
        setCreateDialogOpen(false);
        setNewBotData({ name: "", template: "", model: "gpt" });
        setValidationErrors({});
      }
    } finally {
      setCreatingBot(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;

    try {
      const response = await fetch(
        `/api/protected/loc/${lid}/bots/${botToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete bot");
      }

      onBotDelete(botToDelete.id);
      setDeleteDialogOpen(false);
      setBotToDelete(null);

      toast.success("Bot deleted successfully!");
    } catch (error) {
      console.error("Failed to delete bot:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete bot"
      );
    } finally {
      // Loading state is managed by the parent component
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
                  <Label htmlFor="bot-name">Bot Name *</Label>
                  <Input
                    id="bot-name"
                    value={newBotData.name}
                    onChange={(e) => {
                      setNewBotData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      // Clear validation error when user starts typing
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    placeholder="Enter bot name"
                    className={
                      validationErrors.name ? "border-destructive" : ""
                    }
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {validationErrors.name}
                    </p>
                  )}
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
                    onClick={() => {
                      setCreateDialogOpen(false);
                      setValidationErrors({});
                      setNewBotData({ name: "", template: "", model: "gpt" });
                    }}
                    disabled={creatingBot || loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBot}
                    disabled={
                      !newBotData.name ||
                      creatingBot ||
                      loading ||
                      Object.keys(validationErrors).length > 0
                    }
                  >
                    {creatingBot ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Bot"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading bots...</span>
          </div>
        ) : bots.length === 0 ? (
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
              onClick={() => onBotSelect(bot)}
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
                <p>Updated: {formatDate(bot.updatedAt)}</p>
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
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBot}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Bot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
