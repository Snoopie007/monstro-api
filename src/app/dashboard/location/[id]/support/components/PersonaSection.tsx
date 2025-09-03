"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { SupportBot, SupportBotPersona } from "@/types";
import { PersonaDialog } from "./PersonaDialog";

interface PersonaSectionProps {
  locationId: string;
  supportBot: SupportBot | null;
}

export function PersonaSection({
  locationId,
  supportBot,
}: PersonaSectionProps) {
  const [persona, setPersona] = useState<SupportBotPersona | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load persona when component mounts or supportBot changes
  useEffect(() => {
    if (supportBot) {
      loadPersona();
    }
  }, [supportBot]);

  const loadPersona = async () => {
    if (!supportBot) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/persona`
      );

      if (response.ok) {
        const data = await response.json();
        setPersona(data.persona);
      } else if (response.status !== 404) {
        console.error("Failed to load persona:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to load persona:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = () => {
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditPersona = () => {
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeletePersona = async () => {
    if (
      !persona ||
      !window.confirm("Are you sure you want to delete this persona?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/persona`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPersona(null);
        toast.success("Persona deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete persona");
      }
    } catch (error) {
      console.error("Failed to delete persona:", error);
      toast.error("Failed to delete persona");
    }
  };

  const handleSubmitPersona = async (
    personaData: Partial<SupportBotPersona>
  ) => {
    if (!supportBot) return;

    try {
      const method = isEditing ? "PUT" : "POST";
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/persona`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(personaData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPersona(data.persona);
        toast.success(data.message);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save persona");
      }
    } catch (error) {
      console.error("Failed to save persona:", error);
      throw error;
    }
  };

  if (!supportBot) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">
            Configure your support bot first to create a persona
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User size={18} />
              Bot Persona
            </CardTitle>
            {!persona ? (
              <Button size="sm" onClick={handleCreatePersona} className="gap-2">
                <Plus size={16} />
                Create Persona
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditPersona}
                  className="gap-2"
                >
                  <Edit2 size={14} />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeletePersona}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Customize your support bot's personality and response style
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading persona...</p>
            </div>
          ) : !persona ? (
            <div className="text-center py-8 text-muted-foreground">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>No persona configured</p>
              <p className="text-sm">
                Create a persona to give your bot personality
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {persona.image && (
                  <img
                    src={persona.image}
                    alt={persona.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-medium text-lg">{persona.name}</h3>
                  <p className="text-sm text-muted-foreground">Bot Persona</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Response Style</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {persona.responseStyle}
                </p>
              </div>

              {persona.personalityTraits &&
                persona.personalityTraits.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Personality Traits</h4>
                    <div className="flex flex-wrap gap-2">
                      {persona.personalityTraits.map((trait, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      <PersonaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitPersona}
        initialData={persona}
        isEditing={isEditing}
      />
    </>
  );
}
