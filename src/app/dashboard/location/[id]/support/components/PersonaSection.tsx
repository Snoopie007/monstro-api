"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Plus } from "lucide-react";
import { SupportBot } from "@/types/support";

interface PersonaSectionProps {
  locationId: string;
  supportBot: SupportBot | null;
}

export function PersonaSection({
  locationId,
  supportBot,
}: PersonaSectionProps) {
  const handleCreatePersona = () => {
    // TODO: Implement persona creation
    console.log("TODO: Create persona for support bot", supportBot?.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User size={18} />
            Bot Persona
          </CardTitle>
          <Button size="sm" onClick={handleCreatePersona} className="gap-2">
            <Plus size={16} />
            Create Persona
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize your support bot's personality and response style
        </p>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p>No persona configured</p>
          <p className="text-sm">
            Create a persona to give your bot personality
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
