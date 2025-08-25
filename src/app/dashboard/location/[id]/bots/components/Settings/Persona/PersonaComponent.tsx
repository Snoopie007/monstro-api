"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Loader2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AIPersona, ExtendedBot } from "@/types/bots";
import { NewPersona } from "./NewPersona";
import { ExistingPersona } from "./ExistingPersona";

interface PersonaComponentProps {
  personas: AIPersona[];
  selectedBot: ExtendedBot | null;
  onBotUpdate: (bot: ExtendedBot) => void;
  locationId: string;
}

export function PersonaComponent({
  personas,
  selectedBot,
  onBotUpdate,
  locationId,
}: PersonaComponentProps) {
  const [availablePersonas, setAvailablePersonas] =
    useState<AIPersona[]>(personas);
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [showExistingPersona, setShowExistingPersona] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPersona = selectedBot?.persona?.[0]; // Assuming first persona in array

  const handlePersonaCreated = (newPersona: AIPersona) => {
    setAvailablePersonas((prev) => [...prev, newPersona]);
    // Auto-attach the newly created persona to the current bot
    if (selectedBot) {
      const updatedBot = {
        ...selectedBot,
        persona: [newPersona],
      };
      onBotUpdate(updatedBot);
    }
  };

  const handlePersonaSelected = (persona: AIPersona) => {
    if (selectedBot) {
      const updatedBot = {
        ...selectedBot,
        persona: [persona],
      };
      onBotUpdate(updatedBot);
    }
  };

  const handlePersonaRemove = async () => {
    if (!selectedBot || !currentPersona) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/protected/bots/${selectedBot.id}/persona`, {
      //   method: "DELETE"
      // });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedBot = {
        ...selectedBot,
        persona: [],
      };
      onBotUpdate(updatedBot);
      toast.success("Persona removed from bot");
    } catch (error) {
      toast.error("Failed to remove persona");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedBot) {
    return (
      <div className="space-y-3 border-b border-foreground/40 pb-4">
        <Label className="text-sm text-muted-foreground">
          Select a bot to manage personas
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-foreground/40 pb-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">AI Persona</Label>

        {!currentPersona && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="dark:border-foreground/40"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Persona
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowExistingPersona(true)}>
                <User className="w-4 h-4 mr-2" />
                Select Existing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewPersona(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {currentPersona ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img
                src={currentPersona.image || "/images/default-avatar.png"}
                alt={currentPersona.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-sm">{currentPersona.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentPersona.personality.slice(0, 3).map((trait: string) => (
                  <Badge key={trait} variant="secondary" className="text-xs">
                    {trait}
                  </Badge>
                ))}
                {currentPersona.personality.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{currentPersona.personality.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handlePersonaRemove}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center py-4 border-2 border-dashed border-foreground/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            No persona attached. Add one to give your bot personality.
          </p>
        </div>
      )}

      {/* Dialogs */}
      <NewPersona
        isOpen={showNewPersona}
        onClose={() => setShowNewPersona(false)}
        onPersonaCreated={handlePersonaCreated}
        locationId={locationId}
      />

      <ExistingPersona
        isOpen={showExistingPersona}
        onClose={() => setShowExistingPersona(false)}
        personas={availablePersonas}
        onPersonaSelected={handlePersonaSelected}
        selectedPersonaId={currentPersona?.id}
      />
    </div>
  );
}
