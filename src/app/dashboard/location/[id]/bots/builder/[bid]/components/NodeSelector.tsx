"use client";

import { useState } from "react";
import { Plus, Bot, Split, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBotBuilder } from "../providers";
import { useReactFlow } from "@xyflow/react";

const NODE_TYPES = [
  {
    label: "Standard",
    value: "standard",
    description: "Basic node for simple message responses",
    icon: <Bot className="w-4 h-4" />,
    color: "text-blue-600",
  },
  {
    label: "Extraction",
    value: "extraction",
    description: "Extract information from user messages",
    icon: <Bot className="w-4 h-4" />,
    color: "text-green-600",
  },
  {
    label: "Condition",
    value: "condition",
    description: "Create branching logic based on conditions",
    icon: <Split className="w-4 h-4" />,
    color: "text-orange-600",
  },
  {
    label: "Delay",
    value: "delay",
    description: "Add a timed delay between nodes",
    icon: <Clock className="w-4 h-4" />,
    color: "text-purple-600",
  },
  {
    label: "Booking",
    value: "booking",
    description: "Handle appointment and scheduling flows",
    icon: <Calendar className="w-4 h-4" />,
    color: "text-indigo-600",
  },
];

export function NodeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { addNode } = useBotBuilder();
  const { getViewport, getNodes } = useReactFlow();

  const handleAddNode = (nodeType: string) => {
    const viewport = getViewport();
    const existingNodes = getNodes();

    // Calculate visible area center
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;

    // Create a grid pattern for new nodes
    const gridSize = 200;
    const nodesPerRow = 4;
    const row = Math.floor(existingNodes.length / nodesPerRow);
    const col = existingNodes.length % nodesPerRow;

    const position = {
      x: centerX - (nodesPerRow * gridSize) / 2 + col * gridSize,
      y: centerY - 100 + row * 150,
    };

    addNode(nodeType, position);
    setIsOpen(false); // Modal should close after adding node
  };

  return (
    <>
      {/* Floating Add Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-10 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
        size="lg"
      >
        <Plus className="w-6 h-6 text-white stroke-2" />
        <span className="sr-only">Add Node</span>
      </Button>

      {/* Node Type Selector Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Node</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-2">
                {NODE_TYPES.map((nodeType) => (
                  <Button
                    key={nodeType.value}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => handleAddNode(nodeType.value)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${nodeType.color}`}>
                        {nodeType.icon}
                      </div>
                      <div>
                        <div className="font-medium">{nodeType.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {nodeType.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
