"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { SupportTrigger } from "@/types/supportBot";

interface NewTriggerFormProps {
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

export function NewTriggerForm({ onSubmit, onCancel }: NewTriggerFormProps) {
  const [formData, setFormData] = useState<Partial<SupportTrigger>>({
    name: "",
    triggerType: "keyword",
    triggerPhrases: [],
    toolCall: { name: "", parameters: {} },
    examples: [],
    requirements: [],
    isActive: true,
  });

  const [newPhrase, setNewPhrase] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newRequirement, setNewRequirement] = useState("");

  const handleInputChange = (field: keyof SupportTrigger, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToolCallChange = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      toolCall: { name: toolName, parameters: {} },
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

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...(prev.requirements || []), newRequirement.trim()],
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert("Please enter a trigger name");
      return;
    }

    if (!formData.triggerPhrases?.length) {
      alert("Please add at least one trigger phrase");
      return;
    }

    if (!formData.toolCall?.name) {
      alert("Please select a tool to execute");
      return;
    }

    onSubmit(formData);
  };

  const selectedTool = AVAILABLE_TOOLS.find(
    (tool) => tool.name === formData.toolCall?.name
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="trigger-name">Trigger Name *</Label>
          <Input
            id="trigger-name"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., Membership Status Check"
          />
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
              value={formData.toolCall?.name || ""}
              onValueChange={handleToolCallChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tool" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TOOLS.map((tool) => (
                  <SelectItem key={tool.name} value={tool.name}>
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tool.description}
                      </div>
                    </div>
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

      {/* Requirements */}
      <div>
        <Label>Requirements</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              placeholder="Enter requirement"
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addRequirement())
              }
            />
            <Button type="button" onClick={addRequirement} size="sm">
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requirements?.map((requirement, index) => (
              <Badge
                key={index}
                variant="outline"
                className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
              >
                {requirement}
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
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
        <Button type="submit">Create Trigger</Button>
      </div>
    </form>
  );
}
