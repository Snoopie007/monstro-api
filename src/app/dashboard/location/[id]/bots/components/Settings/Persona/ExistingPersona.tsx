"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/libs/utils";

import { AIPersona } from "@/types/bots";

interface ExistingPersonaProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AIPersona[];
  onPersonaSelected: (persona: AIPersona) => void;
  selectedPersonaId?: string;
}

export function ExistingPersona({
  isOpen,
  onClose,
  personas,
  onPersonaSelected,
  selectedPersonaId,
}: ExistingPersonaProps) {
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handleAttachPersona = async () => {
    if (!selectedPersona) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/protected/bots/${botId}/persona`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ personaId: selectedPersona.id })
      // });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      onPersonaSelected(selectedPersona);
      toast.success(`Attached persona: ${selectedPersona.name}`);
      onClose();
    } catch (error) {
      toast.error("Failed to attach persona");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-4">
        <DialogHeader>
          <DialogTitle>Select AI Persona</DialogTitle>
          <DialogDescription>
            Choose an existing persona to attach to your bot.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {personas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={cn(
                    "flex items-center p-3 border rounded-lg cursor-pointer transition-all",
                    "hover:border-blue-500 hover:bg-blue-50",
                    selectedPersona?.id === persona.id &&
                      "border-blue-500 bg-blue-50",
                    selectedPersonaId === persona.id && "ring-2 ring-blue-200"
                  )}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={persona.image || "/images/default-avatar.png"}
                        alt={persona.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {persona.name}
                        </h4>
                        {selectedPersonaId === persona.id && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.personality.slice(0, 3).map((trait) => (
                          <Badge
                            key={trait}
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {trait}
                          </Badge>
                        ))}
                        {persona.personality.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            +{persona.personality.length - 3}
                          </Badge>
                        )}
                      </div>
                      {persona.responseDetails && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {persona.responseDetails}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedPersona?.id === persona.id && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No personas available. Create one first.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAttachPersona}
            disabled={!selectedPersona || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Attaching...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Attach Persona
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
