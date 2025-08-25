"use client";

import { NodeProps, Node, Handle, Position } from "@xyflow/react";
import { NodeDataType } from "@/types/bots";
import { cn } from "@/libs/utils";
import { Bot } from "lucide-react";
import { useBotBuilder } from "../../providers";
import { useMemo } from "react";

function StandardNode(props: NodeProps<Node<NodeDataType>>) {
  const { invalidNodes } = useBotBuilder();

  const isInvalid = useMemo(() => {
    return invalidNodes.includes(props.id);
  }, [invalidNodes, props.id]);

  return (
    <div
      className={cn(
        "px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] max-w-[200px]",
        isInvalid ? "border-red-500" : "border-gray-200",
        props.selected ? "border-blue-500" : ""
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-gray-600" />
        <div className="font-semibold text-sm text-gray-900">
          {props.data.label || "Standard Node"}
        </div>
      </div>
      
      {props.data.goal && (
        <div className="text-xs text-gray-600 truncate">
          {props.data.goal}
        </div>
      )}

      {isInvalid && (
        <div className="text-xs text-red-500 mt-1">
          Missing required fields
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}

export default StandardNode;
