"use client";

import React, { useState } from "react";
import { createMockScenario } from "@/mocks/bots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface NewScenarioProps {
  botId: string;
}

export function NewScenario({ botId }: NewScenarioProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    trigger: "",
    examples: [""],
    requirements: [""],
    yield: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.trigger.trim()) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/protected/bots/${botId}/scenario`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //         name: formData.name,
      //         trigger: formData.trigger,
      //         examples: formData.examples.filter(e => e.trim()),
      //         requirements: formData.requirements.filter(r => r.trim()),
      //         yield: formData.yield
      //     })
      // });

      // Using mock function for now
      await createMockScenario(botId, {
        name: formData.name,
        trigger: formData.trigger,
        examples: formData.examples.filter((e) => e.trim()),
        requirements: formData.requirements.filter((r) => r.trim()),
        yield: formData.yield,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        trigger: "",
        examples: [""],
        requirements: [""],
        yield: false,
      });
      setOpen(false);

      // TODO: Refresh scenarios list or use global state management
      // For now, the parent component should handle refreshing
    } catch (error) {
      console.error("Failed to create scenario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData((prev) => ({ ...prev, examples: newExamples }));
  };

  const addExample = () => {
    setFormData((prev) => ({ ...prev, examples: [...prev.examples, ""] }));
  };

  const removeExample = (index: number) => {
    if (formData.examples.length > 1) {
      const newExamples = formData.examples.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, examples: newExamples }));
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData((prev) => ({ ...prev, requirements: newRequirements }));
  };

  const addRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ""],
    }));
  };

  const removeRequirement = (index: number) => {
    if (formData.requirements.length > 1) {
      const newRequirements = formData.requirements.filter(
        (_, i) => i !== index
      );
      setFormData((prev) => ({ ...prev, requirements: newRequirements }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus size={16} />
          Add Scenario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scenario-name">Scenario Name</Label>
              <Input
                id="scenario-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Membership Inquiry"
                required
              />
            </div>

            <div>
              <Label htmlFor="trigger-phrase">Trigger Phrase</Label>
              <Input
                id="trigger-phrase"
                value={formData.trigger}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trigger: e.target.value }))
                }
                placeholder="e.g., membership, pricing"
                required
              />
            </div>
          </div>

          <div>
            <Label>Example Phrases</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Add examples of messages that should trigger this scenario
            </p>
            <div className="space-y-2">
              {formData.examples.map((example, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={example}
                    onChange={(e) => handleExampleChange(index, e.target.value)}
                    placeholder="Example message..."
                  />
                  {formData.examples.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeExample(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExample}
                className="gap-2"
              >
                <Plus size={16} />
                Add Example
              </Button>
            </div>
          </div>

          <div>
            <Label>Requirements (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Information that must be collected before this scenario can
              complete
            </p>
            <div className="space-y-2">
              {formData.requirements.map((requirement, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={requirement}
                    onChange={(e) =>
                      handleRequirementChange(index, e.target.value)
                    }
                    placeholder="e.g., email, phone, name"
                  />
                  {formData.requirements.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRequirement(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRequirement}
                className="gap-2"
              >
                <Plus size={16} />
                Add Requirement
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="yield-control"
              checked={formData.yield}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, yield: checked }))
              }
            />
            <Label htmlFor="yield-control">
              Yield control to human agent when complete
            </Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.name.trim() || !formData.trigger.trim() || loading
              }
            >
              {loading ? "Creating..." : "Create Scenario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
