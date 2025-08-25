"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, Play, AlertTriangle } from "lucide-react";
import { useBotBuilder } from "../providers";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export function BuilderMenu() {
  const [isSaving, setIsSaving] = useState(false);
  const { bot, saveBot, validateFlow, invalidNodes } = useBotBuilder();
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBot();
      toast.success("Bot flow saved successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bot"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = () => {
    const invalid = validateFlow();
    if (invalid.length === 0) {
      toast.success("Flow validation passed!");
    } else {
      toast.error(`Flow has ${invalid.length} invalid nodes`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="fixed top-4 left-4 z-10 flex items-center gap-2">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="bg-white rounded-lg shadow-md border p-2 flex items-center gap-2">
        <div className="text-sm font-medium text-gray-700">
          {bot.name || "Untitled Bot"}
        </div>

        {invalidNodes.length > 0 && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">{invalidNodes.length} errors</span>
          </div>
        )}
      </div>

      <Button variant="outline" onClick={handleValidate}>
        <Play className="w-4 h-4 mr-2" />
        Validate
      </Button>

      <Button onClick={handleSave} disabled={isSaving}>
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
