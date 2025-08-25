"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Node, Edge, useReactFlow, useNodesState } from "@xyflow/react";
import { ExtendedBot, NodeDataType } from "@/types/bots";

interface BotBuilderContextType {
  bot: ExtendedBot;
  currentNode: Node<NodeDataType> | null;
  currentEdge: Edge | null;
  invalidNodes: string[];
  nodes: Node<NodeDataType>[];
  onNodesChange: (changes: any) => void;
  setCurrentNode: (node: Node<NodeDataType> | null) => void;
  setCurrentEdge: (edge: Edge | null) => void;
  updateNode: (nodeId: string, updates: Partial<NodeDataType>) => void;
  addNode: (nodeType: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  validateFlow: () => string[];
  saveBot: () => Promise<void>;
}

const BotBuilderContext = createContext<BotBuilderContextType | null>(null);

export function useBotBuilder() {
  const context = useContext(BotBuilderContext);
  if (!context) {
    throw new Error("useBotBuilder must be used within BotBuilderProvider");
  }
  return context;
}

interface BotBuilderProviderProps {
  bot: ExtendedBot;
  children: React.ReactNode;
}

export function BotBuilderProvider({ bot, children }: BotBuilderProviderProps) {
  const [currentNode, setCurrentNode] = useState<Node<NodeDataType> | null>(
    null
  );
  const [currentEdge, setCurrentEdge] = useState<Edge | null>(null);
  const [invalidNodes, setInvalidNodes] = useState<string[]>(
    bot.invalidNodes || []
  );

  // Initialize nodes from bot objectives
  const initialNodes: Node<NodeDataType>[] =
    bot.objectives && bot.objectives.length > 0
      ? bot.objectives.map((objective, index) => ({
          id: `node-${index}`,
          type: "standard",
          position: {
            x: 250 + (index % 3) * 300,
            y: 250 + Math.floor(index / 3) * 200,
          },
          data: objective,
        }))
      : [
          {
            id: "start",
            type: "standard",
            position: { x: 250, y: 250 },
            data: {
              label: "Start",
              goal: "Welcome users and begin conversation",
              paths: {},
              instructions: "Greet the user and ask how you can help them.",
            },
          },
        ];

  // Use ReactFlow's useNodesState for better state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<NodeDataType>) => {
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      });
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  const addNode = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      const newNode: Node<NodeDataType> = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: nodeType,
        position,
        data: {
          label: `New ${nodeType} node`,
          goal: "",
          paths: {},
          instructions: "",
          functions: [],
          config: {},
        },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);

      // Set current node to open the settings panel
      setTimeout(() => setCurrentNode(newNode), 0);
    },
    [nodes, setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nodes.filter((node) => node.id !== nodeId));
      if (currentNode?.id === nodeId) {
        setCurrentNode(null);
      }
    },
    [nodes, setNodes, currentNode?.id]
  );

  const validateFlow = useCallback(() => {
    const invalid: string[] = [];

    nodes.forEach((node) => {
      // Basic validation - check if required fields are filled
      if (!node.data.goal?.trim()) {
        invalid.push(node.id);
      }
    });

    setInvalidNodes(invalid);
    return invalid;
  }, [nodes]);

  const saveBot = useCallback(async () => {
    // TODO: Implement actual save to database
    // Validate before saving
    const invalid = validateFlow();
    if (invalid.length > 0) {
      throw new Error(
        `Cannot save bot with invalid nodes: ${invalid.join(", ")}`
      );
    }

    // Here we would make API call to save the bot
    // await updateBot(bot.id, { objectives: nodes });
  }, [nodes, validateFlow, bot.id]);

  const value = {
    bot,
    currentNode,
    currentEdge,
    invalidNodes,
    nodes,
    onNodesChange,
    setCurrentNode,
    setCurrentEdge,
    updateNode,
    addNode,
    deleteNode,
    validateFlow,
    saveBot,
  };

  return (
    <BotBuilderContext.Provider value={value}>
      {children}
    </BotBuilderContext.Provider>
  );
}
