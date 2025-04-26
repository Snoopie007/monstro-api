'use client'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { useBotBuilder, useHierarchy } from '../providers/AIBotProvider';
import { Node, useReactFlow } from "@xyflow/react";
import { NodeDataType, NodeSettings as NodeSettingsType } from "@/types";
import { stratify } from "d3-hierarchy";
import {
    ConditionNodeSettings,
    ExtractionNodeSettings,
    DelayNodeSettings,
    AINodeSettings,
    GHLIntegration
} from "./NodeForms";
import { RetrievalNodeSettings } from "./NodeForms/retrieval";
import { updateHierarchy } from "../data/utils";

export type NodeSettingsProps = {
    addNodes: (nodes: Node<NodeDataType>[]) => void
    updateNode: (node: Record<string, any>) => void
}


export function NodeSettings() {

    const { currentNode, setCurrentNode, currentEdge, setCurrentEdge, removeInvalidNode, invalidNodes } = useBotBuilder();
    const { setHierarchy, hierarchy } = useHierarchy();
    const { getNodes, setNodes, updateNode } = useReactFlow();
    const nodes = getNodes();

    function handleUpdate(updates: Record<string, any>) {

        updateNode(currentNode?.id!, { data: { ...updates } });
        const current = hierarchy.find(node => node.id === currentNode?.id);
        if (current) {
            current.data = {
                ...current.data,
                ...updates
            }
        }

        if (invalidNodes.includes(currentNode?.id!)) {
            removeInvalidNode(currentNode?.id!);
        }

        setCurrentNode(null);
        setCurrentEdge(null);
    }

    function handleAddNodes(newNodes: Node<NodeDataType>[]) {
        const target = currentEdge?.target;
        const targetIndex = nodes.findIndex((node) => node.id === target);
        nodes.splice(targetIndex, 0, ...newNodes);
        // Create a new hierarchy with the new nodes inserted at the correct position
        const parentId = newNodes[newNodes.length - 1].id;
        const { updatedHierarchy, updatedNodes } = updateHierarchy(nodes, parentId, target);

        // Update the state of the bot builder with the new hierarchy
        setHierarchy(stratify<NodeSettingsType>()(updatedHierarchy));
        setNodes(updatedNodes);

        setCurrentNode(null);
        setCurrentEdge(null);
    }


    const renderNodeSettings = () => {
        if (!currentNode) return null;
        const nodeSettingsMap = {
            'ai': AINodeSettings,
            'condition': ConditionNodeSettings,
            'extraction': ExtractionNodeSettings,
            'retrieval': RetrievalNodeSettings,
            'delay': DelayNodeSettings
        };

        const integrationSettingsMap = {
            'ghl': GHLIntegration
        }

        if (currentNode.type === 'integration') {
            const service = currentNode.options?.integration?.service;

            const ISC = integrationSettingsMap[service as keyof typeof integrationSettingsMap];
            if (ISC) {

                return <ISC addNodes={handleAddNodes} updateNode={handleUpdate} />;
            } else {
                throw new Error(`Unknown integration service: ${service}`);
            }
        }

        if (currentNode.type === 'condition') {
            return <ConditionNodeSettings addNodes={handleAddNodes} />;
        }

        const NodeSettingsComponent = nodeSettingsMap[currentNode.type as keyof typeof nodeSettingsMap];

        if (!NodeSettingsComponent) {
            throw new Error(`Unknown node type: ${currentNode.type}`);
        }

        return <NodeSettingsComponent addNodes={handleAddNodes} updateNode={handleUpdate} />;
    };
    return (
        <Sheet open={!!currentNode} onOpenChange={(open) => setCurrentNode(open ? currentNode : null)}  >

            <SheetContent className="w-[550px] sm:max-w-[550px] sm:w-[550px] p-0" >
                <SheetHeader className=" border-foreground/5  border-b">
                    <SheetTitle >Update {currentNode?.node.label}</SheetTitle>
                    <SheetDescription className="hidden"></SheetDescription>
                </SheetHeader>
                {renderNodeSettings()}
            </SheetContent>
        </Sheet >
    )
}

