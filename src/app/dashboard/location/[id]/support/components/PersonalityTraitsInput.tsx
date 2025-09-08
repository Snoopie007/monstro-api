import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface PersonalityTraitsInputProps {
  traits: string[];
  onAddTrait: (trait: string) => boolean;
  onRemoveTrait: (index: number) => void;
}

export function PersonalityTraitsInput({
  traits,
  onAddTrait,
  onRemoveTrait,
}: PersonalityTraitsInputProps) {
  const [newTrait, setNewTrait] = useState("");

  const handleAddTrait = () => {
    if (onAddTrait(newTrait)) {
      setNewTrait("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTrait();
    }
  };

  return (
    <div className="space-y-2">
      <Label>Personality Traits</Label>
      <div className="flex gap-2">
        <Input
          value={newTrait}
          onChange={(e) => setNewTrait(e.target.value)}
          placeholder="Add a personality trait"
          onKeyPress={handleKeyPress}
        />
        <Button type="button" onClick={handleAddTrait} size="sm">
          <Plus size={16} />
        </Button>
      </div>

      {traits.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {traits.map((trait, index) => (
            <Badge
              key={index}
              variant="outline"
              className="gap-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {trait}
              <button
                type="button"
                onClick={() => onRemoveTrait(index)}
                className="ml-1 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
