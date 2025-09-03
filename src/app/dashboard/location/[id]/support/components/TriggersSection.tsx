"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Plus,
  Zap,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { SupportBot, SupportTrigger } from "@/types";
import { NewTriggerForm } from "./NewTriggerForm";
import { EditTriggerForm } from "./EditTriggerForm";

interface TriggersSectionProps {
  locationId: string;
  supportBot: SupportBot | null;
}

export function TriggersSection({
  locationId,
  supportBot,
}: TriggersSectionProps) {
  const [triggers, setTriggers] = useState<SupportTrigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<SupportTrigger | null>(
    null
  );

  // Load triggers when component mounts or supportBot changes
  useEffect(() => {
    const loadTriggers = async () => {
      if (!supportBot) return;

      setLoading(true);
      try {
        // Load triggers from API
        const response = await fetch(
          `/api/protected/loc/${locationId}/support/triggers`
        );

        if (response.ok) {
          const data = await response.json();
          setTriggers(data.triggers || []);
        } else {
          const error = await response.json();
          throw new Error(error.error || "Failed to load triggers");
        }
      } catch (error) {
        console.error("Failed to load triggers:", error);
        toast.error("Failed to load triggers. Please try again.");
        setTriggers([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadTriggers();
  }, [supportBot]);

  const handleCreateTrigger = async (triggerData: Partial<SupportTrigger>) => {
    if (!supportBot) return;

    try {
      // Create trigger via API
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/triggers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(triggerData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTriggers((prev) => [...prev, data.trigger]);
        setCreateDialogOpen(false);
        toast.success(data.message || "Trigger created successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create trigger");
      }
    } catch (error) {
      console.error("Failed to create trigger:", error);
      toast.error("Failed to create trigger. Please try again.");
    }
  };

  const handleEditTrigger = async (
    triggerId: string,
    triggerData: Partial<SupportTrigger>
  ) => {
    try {
      // Update trigger via API
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/triggers/${triggerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(triggerData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTriggers((prev) =>
          prev.map((trigger) =>
            trigger.id === triggerId ? data.trigger : trigger
          )
        );
        setEditDialogOpen(false);
        setEditingTrigger(null);
        toast.success(data.message || "Trigger updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update trigger");
      }
    } catch (error) {
      console.error("Failed to update trigger:", error);
      toast.error("Failed to update trigger. Please try again.");
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    try {
      // Delete trigger via API
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/triggers/${triggerId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTriggers((prev) =>
          prev.filter((trigger) => trigger.id !== triggerId)
        );
        toast.success(data.message || "Trigger deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete trigger");
      }
    } catch (error) {
      console.error("Failed to delete trigger:", error);
      toast.error("Failed to delete trigger. Please try again.");
    }
  };

  const handleToggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      // Toggle trigger via API
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/triggers/${triggerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTriggers((prev) =>
          prev.map((trigger) =>
            trigger.id === triggerId ? data.trigger : trigger
          )
        );
        toast.success(
          `Trigger ${isActive ? "enabled" : "disabled"} successfully`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to toggle trigger");
      }
    } catch (error) {
      console.error("Failed to toggle trigger:", error);
      toast.error("Failed to toggle trigger. Please try again.");
    }
  };

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case "keyword":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "intent":
        return "bg-green-50 text-green-700 border-green-200";
      case "condition":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getToolCallColor = (toolName: string) => {
    switch (toolName) {
      case "get_member_status":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "get_member_billing":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "get_member_bookable_sessions":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "create_support_ticket":
        return "bg-red-50 text-red-700 border-red-200";
      case "search_knowledge":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (!supportBot) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Zap size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No support bot configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} />
            Support Triggers
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={16} />
                Add Trigger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-4">
              <DialogHeader>
                <DialogTitle>Create New Trigger</DialogTitle>
              </DialogHeader>
              <NewTriggerForm
                onSubmit={handleCreateTrigger}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure triggers that automatically execute specific actions when
          members use certain phrases
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading triggers...</p>
            </div>
          ) : triggers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No triggers configured yet</p>
              <p className="text-sm">
                Create your first trigger to automate responses
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{trigger.name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getTriggerTypeColor(
                          trigger.triggerType
                        )}`}
                      >
                        {trigger.triggerType}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getToolCallColor(
                          trigger.toolCall.name
                        )}`}
                      >
                        {trigger.toolCall.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleTrigger(trigger.id, !trigger.isActive)
                        }
                        className="h-8 w-8 p-0"
                      >
                        {trigger.isActive ? (
                          <ToggleRight size={16} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={16} className="text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTrigger(trigger);
                          setEditDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTrigger(trigger.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <strong>Phrases:</strong>{" "}
                      {trigger.triggerPhrases.join(", ")}
                    </div>
                    {trigger.examples.length > 0 && (
                      <div>
                        <strong>Examples:</strong> {trigger.examples.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Edit Trigger Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
          </DialogHeader>
          {editingTrigger && (
            <EditTriggerForm
              trigger={editingTrigger}
              onSubmit={(data) => handleEditTrigger(editingTrigger.id, data)}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingTrigger(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
