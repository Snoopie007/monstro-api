import { NodeDataType } from "@/types";
import { Edge, getConnectedEdges, Node, useReactFlow } from "@xyflow/react";
import { stratify } from "d3-hierarchy";
import { useContext } from "react";
import { updateLayout, AIBotContext } from ".";

export function useBotUpdate() {
    const { updateNodeData, getNodes, setNodes, setEdges, getEdges, getNode, deleteElements } = useReactFlow<Node<NodeDataType>, Edge>();
    const { state, hasChanged, updateInvalidNodes, setCurrentNode, setCurrentEdge, setHierarchy } = useContext(AIBotContext);
    const { currentNode, currentEdge, hierarchy } = state;

    function updateFlow(virtualNodes: Node<NodeDataType>[], virtualEdges: Edge[]) {
        const { updatedNodes, root } = updateLayout(virtualNodes, virtualEdges);
        hasChanged(true);
        setNodes(updatedNodes);
        setEdges(virtualEdges);
        setHierarchy(root);
        setCurrentNode(null);
        setCurrentEdge(null);
    };

    async function remove(currentNode: Node<NodeDataType>) {
        const nodes = getNodes();
        const edges = getEdges();
        const node = getNode(currentNode.id);
        if (!node) return;

        let removedNodes = [node];

        if (currentNode.data.groupParentId) {
            removedNodes = [...removedNodes, ...nodes.filter(n => n.data.groupParentId === currentNode.id)];
        } else if (currentNode.type === "condition") {
            const hierarchy = stratify<Node<NodeDataType>>()
                .id(d => d.id)
                .parentId(d => edges.find(e => e.target === d.id)?.source)
                (nodes);

            const descendants = hierarchy.find(n => n.id === currentNode.id)?.descendants().map(n => n.data);
            if (descendants) removedNodes = [...removedNodes, ...descendants];
        }

        const connectedEdges = getConnectedEdges(removedNodes, edges);
        const [source, target] = [connectedEdges[0]?.source, connectedEdges[connectedEdges.length - 1]?.target];

        const virtualEdges = edges.filter(e => !connectedEdges.some(ce => ce.id === e.id));
        const virtualNodes = nodes.filter(n => !removedNodes.some(rn => rn.id === n.id));

        if (source && target) {
            virtualEdges.push({ id: `${source}->${target}`, source, target, type: 'plus' });
        }

        updateFlow(virtualNodes, virtualEdges);
    };

    function update(updates: Partial<NodeDataType>) {
        if (!currentNode) return;
        updateNodeData(currentNode.id, { ...currentNode.data, ...updates });
        updateInvalidNodes(prev => prev.filter(id => id !== currentNode.id));
        hasChanged(true);
        setCurrentNode(null);
        setCurrentEdge(null);
    };



    function add(newNodes: Node<NodeDataType>[], newEdges?: Edge[]) {
        if (!currentEdge) return;

        const nodes = getNodes();
        const edges = getEdges();
        const target = nodes.find(n => n.id === currentEdge.target);
        if (!target) return;

        const [firstNode, lastNode] = [newNodes[0], newNodes[newNodes.length - 1]];
        const targetIndex = nodes.findIndex(n => n.id === currentEdge.target);

        const sourceEdge = {
            id: `${currentEdge.source}->${firstNode.id}`,
            source: currentEdge.source,
            target: firstNode.id,
            type: 'plus',
        };

        const targetEdge = {
            id: `${lastNode.id}->${target.id}`,
            source: lastNode.id,
            target: target.id,
            type: 'plus',
        };

        const virtualEdges = edges
            .filter(e => e.id !== currentEdge.id)
            .concat([sourceEdge, ...(newEdges || []), targetEdge]);

        const virtualNodes = [
            ...nodes.slice(0, targetIndex),
            ...newNodes,
            ...nodes.slice(targetIndex)
        ];

        updateFlow(virtualNodes, virtualEdges);
    };

    return {
        currentNode,
        currentEdge,
        setCurrentNode,
        setCurrentEdge,
        update,
        add,
        updateFlow,
        remove,
        hierarchy
    };
}