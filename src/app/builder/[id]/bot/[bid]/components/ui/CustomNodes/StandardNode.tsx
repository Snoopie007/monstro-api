'use client'

import { NodeProps, Node } from '@xyflow/react';
import { cn } from '@/libs/utils';
import { NodeDataType } from '@/types';
import NodeActions from '../NodeActions';
import { NodeContent, NodeTitle, NodeTrigger, NodeWrapper } from '../node';
import { Icon } from '@/components/icons';
import { useBotBuilder } from '../../../providers';





export default function StandardNode(currentNode: NodeProps<Node<NodeDataType>>) {
    const { invalidNodes } = useBotBuilder();

    const isValid = !invalidNodes.includes(currentNode.id);

    function showActions() {
        const isGroup = currentNode.data.groupParentId ? true : false

        if (isGroup) {
            if (currentNode.data.groupParentId === currentNode.id) {
                return true
            }
            return false
        }
        return true
    }
    return (
        <NodeWrapper currentNode={currentNode} isValid={isValid}>

            {showActions() && (
                <NodeTrigger>
                    <NodeActions currentNode={currentNode} />
                </NodeTrigger>
            )}
            <NodeContent>
                <NodeTitle>
                    <span className={cn('bg-indigo-700 rounded-xs p-0.5', { 'bg-red-500': !isValid })}>
                        <Icon name='Bot' size={10} className='stroke-white' />
                    </span>
                    <span className={cn('text-[10px]  text-inherit font-medium', !isValid && 'text-red-500')}>
                        {currentNode.data.label}
                    </span>
                </NodeTitle>

            </NodeContent>
        </NodeWrapper>
    );
}
