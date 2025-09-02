"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Circle,
  Zap,
  RotateCcw,
  Clock,
  MessageSquare,
} from "lucide-react";

interface NodeTransition {
  from: string;
  to: string;
  reason?: string;
  timestamp?: Date;
}

interface ToolCall {
  function: string;
  result: any;
  timestamp: Date;
}

interface NodeFlowTrackerProps {
  currentNode?: string;
  nodeTransitions: NodeTransition[];
  toolCalls: ToolCall[];
  sessionId?: string;
  onResetFlow?: () => void;
  isVisible?: boolean;
}

export function NodeFlowTracker({
  currentNode = "start",
  nodeTransitions = [],
  toolCalls = [],
  sessionId,
  onResetFlow,
  isVisible = true,
}: NodeFlowTrackerProps) {
  if (!isVisible) return null;

  // Get recent transitions (last 5)
  const recentTransitions = nodeTransitions.slice(-5);

  // Get recent tool calls (last 3)
  const recentToolCalls = toolCalls.slice(-3);

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Circle className="w-4 h-4 text-blue-600" />
            Node Flow Tracker
          </CardTitle>
          {onResetFlow && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFlow}
              className="gap-1 text-xs h-7"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Flow
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Node */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Current Node:
          </span>
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
            {currentNode}
          </Badge>
        </div>

        {/* Session ID */}
        {sessionId && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Session:
            </span>
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {sessionId.slice(-8)}
            </code>
          </div>
        )}

        {/* Node Transitions Path */}
        {recentTransitions.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Recent Flow:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {(() => {
                // Build a continuous flow path from transitions
                const flowPath: string[] = [];

                if (recentTransitions.length > 0) {
                  // Start with the first 'from' node
                  flowPath.push(recentTransitions[0].from);

                  // Add each 'to' node in sequence
                  recentTransitions.forEach((transition) => {
                    flowPath.push(transition.to);
                  });
                }

                return flowPath.map((node, index) => (
                  <React.Fragment key={`flow-${index}`}>
                    <Badge
                      variant={
                        index === flowPath.length - 1 ? "default" : "outline"
                      }
                      className={
                        index === flowPath.length - 1
                          ? "bg-blue-600 hover:bg-blue-700 text-xs"
                          : "text-xs"
                      }
                    >
                      {node}
                    </Badge>
                    {index < flowPath.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </React.Fragment>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Tool Executions */}
        {recentToolCalls.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Tool Calls:
            </span>
            <div className="space-y-1">
              {recentToolCalls.map((toolCall, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-yellow-600" />
                  <code className="bg-yellow-50 px-1 py-0.5 rounded text-yellow-800">
                    {toolCall.function}
                  </code>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-700">
                    {typeof toolCall.result === "string"
                      ? toolCall.result.slice(0, 20) +
                        (toolCall.result.length > 20 ? "..." : "")
                      : "success"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {nodeTransitions.length} transitions
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {toolCalls.length} tool calls
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Active session
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
