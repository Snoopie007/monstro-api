"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/forms/form";

import {
  AIPersonaSchema,
  AIPersonaFormData,
  AIPersonalities,
  AIPersonaImages,
} from "./PersonaSchema";
import { usePersonas } from "@/hooks/usePersonas";
import { AIPersona } from "@/types/bots";

interface NewPersonaProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonaCreated: (persona: AIPersona) => void;
  locationId: string;
}

export function NewPersona({
  isOpen,
  onClose,
  onPersonaCreated,
  locationId,
}: NewPersonaProps) {
  const { createPersona, loading } = usePersonas(locationId);

  const form = useForm<AIPersonaFormData>({
    resolver: zodResolver(AIPersonaSchema),
    defaultValues: {
      name: "",
      personality: [],
      image: "",
      responseDetails: "",
    },
    mode: "onChange",
  });

  const selectedImage = form.watch("image");
  const selectedPersonalities = form.watch("personality");

  const handlePersonalityToggle = (personality: string) => {
    const current = selectedPersonalities || [];
    const updated = current.includes(personality)
      ? current.filter((p) => p !== personality)
      : [...current, personality];
    form.setValue("personality", updated);
  };

  const onSubmit = async (data: AIPersonaFormData) => {
    const newPersona = await createPersona(data);

    if (newPersona) {
      onPersonaCreated(newPersona);
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <DialogTitle>Create AI Persona</DialogTitle>
          <DialogDescription>
            Define a personality for your bot to make conversations more
            engaging.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Selection */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choose Avatar</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {AIPersonaImages.map((image, i) => (
                        <div
                          key={i}
                          className={`relative border-2 cursor-pointer rounded-lg transition-all duration-300 hover:scale-110 ${
                            selectedImage === image
                              ? "border-blue-500 scale-110"
                              : "border-transparent"
                          }`}
                          onClick={() => field.onChange(image)}
                        >
                          <img
                            src={image}
                            alt="avatar"
                            width={50}
                            height={50}
                            className={`rounded-lg transition-all duration-300 ${
                              selectedImage === image
                                ? "grayscale-0"
                                : "grayscale hover:grayscale-0"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Friendly Assistant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Personality Traits */}
            <FormField
              control={form.control}
              name="personality"
              render={() => (
                <FormItem>
                  <FormLabel>Personality Traits</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {AIPersonalities.map((personality) => {
                        const isSelected =
                          selectedPersonalities?.includes(personality);
                        return (
                          <Badge
                            key={personality}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => handlePersonalityToggle(personality)}
                          >
                            {personality}
                            {isSelected && <X className="w-3 h-3 ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Response Style */}
            <FormField
              control={form.control}
              name="responseDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Style</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe how this persona should communicate..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Persona
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
