'use client'

import { NodeProps, Node } from '@xyflow/react';
import { Split } from 'lucide-react';
import NodeActions from '../NodeActions';
import { NodeContent, NodeTitle, NodeTrigger, NodeWrapper } from '../node';
import { NodeDataType } from '@/types';

export default function ConditionNode(currentNode: NodeProps<Node<NodeDataType>>) {

    return (
        <NodeWrapper currentNode={currentNode} isValid={true}>
            <NodeTrigger>
                <NodeActions currentNode={currentNode} />
            </NodeTrigger>
            <NodeContent>
                <NodeTitle>
                    <span className='bg-indigo-700 rounded-[2px] p-0.5'><Split size={10} className='stroke-white rotate-180' /></span>
                    <span className='text-[10px] font-medium'>{currentNode.data.label}</span>
                </NodeTitle>

            </NodeContent>
        </NodeWrapper>
    );
}
