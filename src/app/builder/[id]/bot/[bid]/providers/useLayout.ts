import { NodeDataType } from "@/types";
import { Edge, Node } from "@xyflow/react";
import { HierarchyNode, stratify, tree } from "d3-hierarchy";

const layout = tree<Node<NodeDataType>>().nodeSize([250, 100]).separation((a, b) => 1)

type UpdateLayoutResult = {
    updatedNodes: Node<NodeDataType>[],
    root: HierarchyNode<Node<NodeDataType>> | null
}

export function updateLayout(nodes: Node<NodeDataType>[], edges: Edge[]): UpdateLayoutResult {
    if (nodes.length === 0) return { updatedNodes: [], root: null };

    const hierarchy = stratify<Node<NodeDataType>>()
        .id((d) => d.id)
        .parentId((d: Node<NodeDataType>) => {

            const edge = edges.find((e: Edge) => e.target === d.id);
            if (edge) {

                return edge.source;
            }
            return undefined;
        })(nodes);

    const root = layout(hierarchy);

    const updatedNodes = root.descendants().map((n) => {
        return {
            ...n.data,
            position: {
                x: n.x,
                y: n.y
            }
        }
    });

    return { updatedNodes, root };
} 