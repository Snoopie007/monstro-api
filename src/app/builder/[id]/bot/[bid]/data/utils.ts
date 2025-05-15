
import { NodeDataType } from "@/types";

import { Node } from "@xyflow/react";

import { customAlphabet } from "nanoid";
import {
    AINodeSchema,
    ExtractionNodeSchema,
    RetrievalNodeSchema,
    DelayNodeSchema,
    GHLIntegrationSchema
} from "../components/NodeForms/schemas";




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

export function validateNodes(n: Node<NodeDataType>): boolean {
    const { data } = n;

    if (n.type === 'integration') {

        if (!data || !data.integration) {
            return false;
        }
        const schema = IntegrationSchemaMap[data.integration.service];
        const result = schema.safeParse(data);
        return result.success;
    }

    const schema = ValidationSchemaMap[n.type!];
    if (!schema) {
        return true;
    }
    const result = schema.safeParse(data);
    return result.success;

}