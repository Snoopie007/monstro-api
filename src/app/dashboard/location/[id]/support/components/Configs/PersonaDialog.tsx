"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  Button,
  DialogTitle,
} from "@/components/ui";
import { toast } from "react-toastify";
import { SupportPersona } from "@/types/support";
import { usePersonaForm } from "../../hooks/usePersonaForm";
import { PersonalityTraitsInput } from "./PersonalityTraitsInput";
import { TextField, TextAreaField } from "./PersonaFormFields";

interface PersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (personaData: Partial<SupportPersona>) => Promise<void>;
  initialData?: SupportPersona | null;
  isEditing?: boolean;
}

export function PersonaDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}: PersonaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    formData,
    updateField,
    addPersonalityTrait,
    removePersonalityTrait,
    resetForm,
    validateForm,
  } = usePersonaForm(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      toast.error(validation.errors.join(", "));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);

      // Reset form if creating new persona
      if (!isEditing) {
        resetForm();
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
          <TextField
            id="persona-name"
            label="Persona Name"
            value={formData.name}
            onChange={(value) => updateField("name", value)}
            placeholder="e.g., Alex, Friendly Assistant, etc."
            required
          />

          <TextField
            id="persona-image"
            label="Avatar Image URL (optional)"
            type="url"
            value={formData.image}
            onChange={(value) => updateField("image", value)}
            placeholder="https://example.com/avatar.jpg"
          />

          <TextAreaField
            id="response-style"
            label="Response Style"
            value={formData.responseStyle}
            onChange={(value) => updateField("responseStyle", value)}
            placeholder="Describe how the bot should respond (e.g., friendly and professional, casual and helpful, etc.)"
            rows={3}
            required
          />

          <PersonalityTraitsInput
            traits={formData.personalityTraits}
            onAddTrait={addPersonalityTrait}
            onRemoveTrait={removePersonalityTrait}
          />

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
