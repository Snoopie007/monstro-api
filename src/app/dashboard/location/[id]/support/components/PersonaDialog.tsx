"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { SupportBotPersona } from "@/types/supportBot";

interface PersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (personaData: Partial<SupportBotPersona>) => Promise<void>;
  initialData?: SupportBotPersona | null;
  isEditing?: boolean;
}

export function PersonaDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}: PersonaDialogProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    image: initialData?.image || "",
    responseStyle: initialData?.responseStyle || "",
    personalityTraits: initialData?.personalityTraits || [],
  });
  const [newTrait, setNewTrait] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addPersonalityTrait = () => {
    if (
      newTrait.trim() &&
      !formData.personalityTraits.includes(newTrait.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        personalityTraits: [...prev.personalityTraits, newTrait.trim()],
      }));
      setNewTrait("");
    }
  };

  const removePersonalityTrait = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      personalityTraits: prev.personalityTraits.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.responseStyle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);

      // Reset form if creating new persona
      if (!isEditing) {
        setFormData({
          name: "",
          image: "",
          responseStyle: "",
          personalityTraits: [],
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save persona:", error);
      toast.error("Failed to save persona. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] py-4">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit Support Bot Persona"
              : "Create Support Bot Persona"}
          </DialogTitle>
          <DialogDescription>
            Give your support bot a personality and response style to match your
            brand.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="persona-name">
              Persona Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="persona-name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Alex, Friendly Assistant, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-image">Avatar Image URL (optional)</Label>
            <Input
              id="persona-image"
              value={formData.image}
              onChange={(e) => handleInputChange("image", e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="response-style">
              Response Style <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="response-style"
              value={formData.responseStyle}
              onChange={(e) =>
                handleInputChange("responseStyle", e.target.value)
              }
              placeholder="Describe how the bot should respond (e.g., friendly and professional, casual and helpful, etc.)"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Personality Traits</Label>
            <div className="flex gap-2">
              <Input
                value={newTrait}
                onChange={(e) => setNewTrait(e.target.value)}
                placeholder="Add a personality trait"
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), addPersonalityTrait())
                }
              />
              <Button type="button" onClick={addPersonalityTrait} size="sm">
                <Plus size={16} />
              </Button>
            </div>

            {formData.personalityTraits.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.personalityTraits.map((trait, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="gap-1 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {trait}
                    <button
                      type="button"
                      onClick={() => removePersonalityTrait(index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Update Persona"
                : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
