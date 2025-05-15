'use client'
import {
    Background,
    Node,
    Controls,
    Edge,
    MiniMap,
    ReactFlow,
    ColorMode,
} from '@xyflow/react';

import { useEffect, useState } from 'react';
import {
    NodeTypes,
    NodeSelector,
    EdgeTypes,
    NodeSettings,
} from './components';

import { NodeDataType } from '@/types/';
import { useTheme } from 'next-themes';
import { useBotUpdate } from './providers';


const DEFAULT_NODES: Node<NodeDataType>[] = [
    { id: "start", data: { label: "Start" }, type: "start", position: { x: 0, y: 0 } },
    { id: "end", data: { label: "End" }, type: "end", position: { x: 0, y: 100 }, parentId: "start" }
]

const DEFAULT_EDGES: Edge[] = [
    { id: "start->end", source: "start", target: "end", type: "plusEdge" }
]



export default function BotFlow({ initialNodes, initialEdges }: { initialNodes: Node<NodeDataType>[], initialEdges: Edge[] }) {
    const [open, setOpen] = useState(false);
    const { theme } = useTheme();
    const [colorMode, setColorMode] = useState<ColorMode>('dark');
    const { setCurrentNode, setCurrentEdge } = useBotUpdate();

    useEffect(() => {
        setColorMode(theme as ColorMode);
    }, [theme]);


    function handleNodeClicked(e: React.MouseEvent, n: Node<NodeDataType>) {
        e.preventDefault();
        if (n.data.editable === false) return
        if (['path'].includes(n.type!)) return
        setCurrentNode(n);
    }

    function handleEdgeClicked(e: React.MouseEvent, edge: Edge) {
        e.preventDefault();
        if (edge.type === 'lockedEdge') return;
        setCurrentEdge(edge);
        setOpen(true);
    }

    return (
        <div className='h-full w-full '>
            <NodeSelector open={open} setOpen={setOpen} />
            <NodeSettings />
            <ReactFlow
                defaultNodes={initialNodes.length > 0 ? initialNodes : DEFAULT_NODES}
                defaultEdges={initialEdges.length > 0 ? initialEdges : DEFAULT_EDGES}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnDoubleClick={false}
                onNodeClick={handleNodeClicked}
                onEdgeClick={handleEdgeClicked}
                edgeTypes={EdgeTypes}
                nodeTypes={NodeTypes}
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
