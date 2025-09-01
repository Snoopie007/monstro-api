"use client";

import React, { useState } from "react";
import { BotScenario } from "@/types/bots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Lightbulb,
  MessageSquare,
  CheckSquare,
  ArrowRight,
} from "lucide-react";

// Helper function to safely format dates
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "Never";

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Never";
  }
};

interface ScenarioCompProps {
  scenario: BotScenario;
}

export function ScenarioComp({ scenario }: ScenarioCompProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/protected/bots/scenario/${scenario.id}`, {
      //     method: 'DELETE'
      // });

      // Mock deletion delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Refresh scenarios list or use global state management
      console.log("Scenario deleted:", scenario.id);

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete scenario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // TODO: Open edit dialog or navigate to edit page
    console.log("Edit scenario:", scenario.id);
  };

  return (
    <>
      <Card className="border-l-4 border-l-primary/20">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-normal justify-start"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown
                        size={16}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                    <Lightbulb size={16} className="text-primary" />
                    <CardTitle className="text-base font-medium">
                      {scenario.name}
                    </CardTitle>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <div className="flex items-center gap-2">
                {scenario.yield && (
                  <Badge variant="secondary" className="text-xs">
                    <ArrowRight size={12} className="mr-1" />
                    Yields to Human
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Trigger:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {scenario.trigger}
              </Badge>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Examples */}
              {scenario.examples.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare
                      size={14}
                      className="text-muted-foreground"
                    />
                    <span className="text-sm font-medium">Example Phrases</span>
                  </div>
                  <div className="space-y-1">
                    {scenario.examples.map((example, index) => (
                      <div
                        key={index}
                        className="text-sm bg-muted/50 p-2 rounded border-l-2 border-l-blue-200"
                      >
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {scenario.requirements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Requirements</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scenario.requirements.map((requirement, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {requirement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow/Routine Info */}
              {(scenario.workflowId || scenario.routineId) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Connected To</span>
                  </div>
                  <div className="space-y-1">
                    {scenario.workflowId && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Workflow:</span>{" "}
                        {scenario.workflowId}
                      </div>
                    )}
                    {scenario.routineId && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Routine:</span>{" "}
                        {scenario.routineId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {formatDate(scenario.createdAt)}
                  </div>
                  {scenario.updatedAt && (
                    <div>
                      <span className="font-medium">Updated:</span>{" "}
                      {formatDate(scenario.updatedAt)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the scenario "{scenario.name}"?
              This action cannot be undone and will remove all trigger phrases,
              examples, and requirements for this scenario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete Scenario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
