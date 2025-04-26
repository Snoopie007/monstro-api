
import { NodeDataType, NodeSettings } from "@/types";

import { Node } from "@xyflow/react";

import { customAlphabet } from "nanoid";
import {
    AINodeSchema,
    ExtractionNodeSchema,
    RetrievalNodeSchema,
    DelayNodeSchema,
    GHLIntegrationSchema
} from "../components/NodeForms/schemas";

type UpdateHierarchyResult = {
    updatedHierarchy: NodeSettings[],
    updatedNodes: Node[]
}
/**
 * Adds new nodes to the hierarchy and updates the state of the bot builder
 * @param nodes The nodes to update
 * @param newNodes The new nodes to add
 * @param target The id of the target no    de  
 */
export function updateHierarchy(nodes: Node[], parentId: string, target?: string): UpdateHierarchyResult {
    // Create a new hierarchy with the new nodes inserted at the correct position
    const updatedHierarchy: NodeSettings[] = [];
    const updatedNodes: Node[] = [];
    // Iterate over the nodes and update the hierarchy
    nodes.forEach((n) => {
        const { data, type, measured, ...rest } = n;
        const { node, options } = data as NodeDataType;
        if (n.id === target) {

            updatedNodes.push({ ...rest, parentId, data: n.data });
            updatedHierarchy.push({ ...rest, node, options, parentId, type: type || 'unknown' });
            return;
        }

        updatedNodes.push(n);
        updatedHierarchy.push({ ...rest, node, options, type: type || 'unknown' });
    });

    return { updatedHierarchy, updatedNodes };

}


export function generateNodeId() {
    return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 21)();
}


const ValidationSchemaMap: Record<string, any> = {
    'ai': AINodeSchema,
    'extraction': ExtractionNodeSchema,
    'retrieval': RetrievalNodeSchema,
    'delay': DelayNodeSchema
}

const IntegrationSchemaMap: Record<string, any> = {
    'ghl': GHLIntegrationSchema
}

export function validateNodes(n: NodeSettings): boolean {
    const { options, node } = n;

    if (n.type === 'integration') {

        if (!options || !options.integration) {
            return false;
        }
        const schema = IntegrationSchemaMap[options.integration.service];
        const result = schema.safeParse({
            options: options,
            node: node
        });
        return result.success;
    }

    const schema = ValidationSchemaMap[n.type];
    if (!schema) {
        return true;
    }
    const result = schema.safeParse({
        options: options,
        node: node
    });
    return result.success;

}