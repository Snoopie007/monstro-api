'use client'
import {
    Background,
    Node,
    Controls,
    Edge,
    MiniMap,
    ReactFlow,
    ColorMode,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';

import { useEffect, useState } from 'react';
import {
    PlusEdge, ConditionNode, RootNode, CustomNode,
    PathNode, NodeSelector, NodeSettings,
    LockedEdge,
} from './components';

import { NodeDataType } from '@/types';
import { useBotBuilder, useHierarchy } from './providers';
import { useTheme } from 'next-themes';


const edgeTypes = { 'plusEdge': PlusEdge, 'lockedEdge': LockedEdge };
const nodeTypes = {
    'start': RootNode,
    'end': RootNode,
    'ai': CustomNode,
    'retrieval': CustomNode,
    'extraction': CustomNode,
    "condition": ConditionNode,
    "path": PathNode,
    "integration": CustomNode
};


export default function BotFlow() {
    const { theme } = useTheme();
    const [open, setOpen] = useState<boolean>(false);
    const [colorMode, setColorMode] = useState<ColorMode>('dark');
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeDataType>>([]);
    const { setCurrentNode, setCurrentEdge } = useBotBuilder();
    const { hierarchy } = useHierarchy();

    useEffect(() => {
        setColorMode(theme as ColorMode);
    }, [theme]);



    useEffect(() => {
        if (hierarchy) {
            const nodesRef: Node<NodeDataType>[] = [];
            hierarchy.eachBefore((n) => {

                const { options, node, ...rest } = n.data;
                nodesRef.push({
                    ...rest,
                    data: { node: node, options: options }
                });

            });

            setNodes(nodesRef);
        }
    }, [hierarchy]);

    useEffect(() => {

        let edges: Edge[] = [];
        hierarchy?.eachBefore((h) => {


            if (h.children) {
                const source = h.data;

                if (source.type === "condition") {
                    h.children.forEach((c) => {
                        edges.push({
                            id: `edge-${source.id}-${c.data.id}`,
                            source: source.id,
                            target: c.data.id,
                            type: "smoothstep",
                        });
                    });
                    return;
                }


                const target = h.children[0].data;

                const hasGroupParent = !!source.node.groupParentId && !!target.node.groupParentId;
                if (hasGroupParent && source.node.groupParentId === target.node.groupParentId) {
                    edges.push({
                        id: `edge-${source.id}-${target.id}`,
                        source: source.id,
                        target: target.id,
                        type: "lockedEdge",
                    });
                    return;
                }


                edges.push({
                    id: `edge-${source.id}-${target.id}`,
                    source: source.id,
                    target: target.id,
                    type: "plusEdge",
                });

            }
        })
        setEdges(edges);

    }, [nodes]);

    function handleNodeClicked(e: React.MouseEvent, n: Node<NodeDataType>) {
        if (n.data.node.editable === false) return
        if (['path'].includes(n.type!)) return
        const { node, options } = n.data;

        setCurrentNode({ ...n, options: options, node, type: n.type || 'unknown' });
    }

    function handleEdgeClicked(e: React.MouseEvent, edge: Edge) {
        if (edge.type === 'lockedEdge') return;
        setOpen(true);
        setCurrentEdge(edge);
    }

    return (
        <div className='h-full w-full '>
            <NodeSelector open={open} setOpen={setOpen} />
            <NodeSettings />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodesDraggable={false}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClicked}
                onEdgeClick={handleEdgeClicked}
                edgeTypes={edgeTypes}
                nodeTypes={nodeTypes}
                colorMode={colorMode}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background gap={20} size={1} />
            </ReactFlow>
        </div>
    )
}
