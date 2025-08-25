"use client";

import { Background, Node, MiniMap, ReactFlow, ColorMode } from "@xyflow/react";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useBotBuilder } from "../providers";
import { NodeDataType } from "@/types/bots";
import { NodeTypes } from "../components/CustomNodes";
import { NodeSelector } from "../components/NodeSelector";
import { NodeSettings } from "../components/NodeSettings";
import { BuilderMenu } from "../components/BuilderMenu";

export function BotBuilder() {
  const { theme } = useTheme();
  const [colorMode, setColorMode] = useState<ColorMode>("dark");
  const { setCurrentNode, nodes, onNodesChange } = useBotBuilder();

  useEffect(() => {
    setColorMode(theme as ColorMode);
  }, [theme]);

  // Node initialization is now handled in the provider

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeDataType>) => {
      event.preventDefault();
      setCurrentNode(node);
    },
    [setCurrentNode]
  );

  // Remove the local onNodesChange since we're using the one from the provider

  return (
    <div className="h-screen w-screen relative">
      <BuilderMenu />
      <NodeSelector />
      <NodeSettings />

      <ReactFlow
        nodes={nodes}
        nodesDraggable={true}
        nodesConnectable={true}
        zoomOnDoubleClick={false}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
        nodeTypes={NodeTypes}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        style={{ width: "100%", height: "100%" }}
      >
        <MiniMap />
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
