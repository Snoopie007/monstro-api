"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button, Badge } from "@/components/ui";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/forms";
import { X, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { SupportTrigger } from "@/types";

interface EditTriggerFormProps {
  trigger: SupportTrigger;
  onSubmit: (triggerData: Partial<SupportTrigger>) => void;
  onCancel: () => void;
}

const AVAILABLE_TOOLS = [
  {
    name: "get_member_status",
    description: "Get member subscription and package status",
    category: "member-info",
  },
  {
    name: "get_member_billing",
    description: "Get member billing and payment information",
    category: "member-info",
  },
  {
    name: "get_member_bookable_sessions",
    description: "Get classes the member can book",
    category: "member-info",
  },
  {
    name: "create_support_ticket",
    description: "Create a support ticket for issue tracking",
    category: "support",
  },
  {
    name: "update_ticket_status",
    description: "Update the status of a support ticket",
    category: "support",
  },
  {
    name: "search_knowledge",
    description: "Search the knowledge base for information",
    category: "knowledge",
  },
  {
    name: "escalate_to_human",
    description: "Escalate conversation to human agent",
    category: "support",
  },
];

export function EditTriggerForm({
  trigger,
  onSubmit,
  onCancel,
}: EditTriggerFormProps) {
  const [formData, setFormData] = useState<Partial<SupportTrigger>>({});
  const [newPhrase, setNewPhrase] = useState("");
  const [newExample, setNewExample] = useState("");

  // Initialize form data with trigger values
  useEffect(() => {
    setFormData({
      name: trigger.name,
      triggerType: trigger.triggerType,
      triggerPhrases: [...trigger.triggerPhrases],
      toolCall: trigger.toolCall,
      examples: [...trigger.examples],
      isActive: trigger.isActive,
    });
  }, [trigger]);

  const handleInputChange = (field: keyof SupportTrigger, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToolCallChange = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      toolCall: { name: toolName, parameters: {}, description: "", args: [] },
    }));
  };

  const addPhrase = () => {
    if (newPhrase.trim()) {
      setFormData((prev) => ({
        ...prev,
        triggerPhrases: [...(prev.triggerPhrases || []), newPhrase.trim()],
      }));
      setNewPhrase("");
    }
  };

  const removePhrase = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      triggerPhrases: prev.triggerPhrases?.filter((_, i) => i !== index) || [],
    }));
  };

  const addExample = () => {
    if (newExample.trim()) {
      setFormData((prev) => ({
        ...prev,
        examples: [...(prev.examples || []), newExample.trim()],
      }));
      setNewExample("");
    }
  };

  const removeExample = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      examples: prev.examples?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Please enter a trigger name");
      return;
    }

    if (!formData.triggerPhrases?.length) {
      toast.error("Please add at least one trigger phrase");
      return;
    }

    if (!formData.toolCall?.name) {
      toast.error("Please select a tool to execute");
      return;
    }
    onSubmit(formData);
  };

  const selectedTool = AVAILABLE_TOOLS.find(
    (tool) => tool.name === formData.toolCall?.name
  );

  const CamelCaseToolName = (toolName: string) => {
    return toolName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {/* Active Status Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <Label htmlFor="trigger-name">Trigger Name</Label>
          <Input
            id="trigger-name"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., Membership Status Check"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="is-active">Active</Label>
          <Switch
            id="is-active"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              handleInputChange("isActive", checked)
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="trigger-type">Trigger Type</Label>
          <Select
            value={formData.triggerType}
            onValueChange={(value) => handleInputChange("triggerType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">Keyword</SelectItem>
              <SelectItem value="intent">Intent</SelectItem>
              <SelectItem value="condition">Condition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tool-call">Tool to Execute *</Label>
          <Select
            key={formData.toolCall?.name || "empty"}
            value={formData.toolCall?.name || ""}
            onValueChange={handleToolCallChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a tool" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_TOOLS.map((tool) => (
                <SelectItem key={tool.name} value={tool.name}>
                  {CamelCaseToolName(tool.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTool && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTool.description}
            </p>
          )}
        </div>
      </div>

      {/* Trigger Phrases */}
      <div>
        <Label>Trigger Phrases *</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              placeholder="Enter trigger phrase"
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addPhrase())
              }
            />
            <Button type="button" onClick={addPhrase} size="sm">
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.triggerPhrases?.map((phrase, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {phrase}
                <button
                  type="button"
                  onClick={() => removePhrase(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Examples */}
      <div>
        <Label>Example Messages</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Enter example message"
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addExample())
              }
            />
            <Button type="button" onClick={addExample} size="sm">
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.examples?.map((example, index) => (
              <Badge key={index} variant="outline" className="gap-1">
                {example}
                <button
                  type="button"
                  onClick={() => removeExample(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Trigger</Button>
      </div>
    </form>
  );
}
