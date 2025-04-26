'use client'

import { Handle, NodeProps, Position, Node } from '@xyflow/react';
import { cn } from '@/libs/utils';
import { NodeDataType } from '@/types';
import { Spline, Split, } from 'lucide-react';
import NodeActions from '../NodeActions';
import { NodeContent, NodeTitle, NodeTrigger, NodeWrapper } from './node';
import {
    AINodeSchema, DelayNodeSchema,
    ExtractionNodeSchema, GHLIntegrationSchema,
    RetrievalNodeSchema
} from '../NodeForms/schemas';
import { Icon } from '@/components/icons';
import { useBotBuilder } from '../../providers';

function RootNode({ id, data }: NodeProps<Node<NodeDataType>>) {
    return (
        <div
            className={cn('rounded-xs border-black flex flex-row border  max-w-[40px] translate-x-[80px] h-[20px] items-center w-[40px] bg-foreground/10 ')}
            onClick={(e) => e.stopPropagation()}
        >
            {id !== "start" && <Handle type="target" position={Position.Top} />}
            <div className='w-full text-clip text-[8px] font-roboto text-foreground uppercase text-center '>
                {data.node.label}
            </div>
            {id !== "end" && <Handle
                type="source"
                position={Position.Bottom}
                id={id}

            />}

        </div>
    );
}



function CustomNode(currentNode: NodeProps<Node<NodeDataType>>) {
    const { invalidNodes } = useBotBuilder();

    const isValid = !invalidNodes.includes(currentNode.id);

    function showActions() {
        const isGroup = currentNode.data.node.groupParentId

        if (isGroup) {
            if (currentNode.data.node.groupParentId === currentNode.id) {
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
                        {currentNode.data.node.label}
                    </span>
                </NodeTitle>

            </NodeContent>
        </NodeWrapper>
    );
}


function ConditionNode(currentNode: NodeProps<Node<NodeDataType>>) {

    return (
        <NodeWrapper currentNode={currentNode} isValid={true}>
            <NodeTrigger>
                <NodeActions currentNode={currentNode} />
            </NodeTrigger>
            <NodeContent>
                <NodeTitle>
                    <span className='bg-indigo-700 rounded-[2px] p-0.5'><Split size={10} className='stroke-white rotate-180' /></span>
                    <span className='text-[10px] font-medium'>{currentNode.data.node.label}</span>
                </NodeTitle>

            </NodeContent>
        </NodeWrapper>
    );
}

function PathNode({ id, data }: NodeProps<Node<NodeDataType>>) {
    return (
        <div className={cn('border-foreground w-[100px] translate-x-[50px] h-[30px]   px-2 bg-transparent border relative')}>
            <Handle type="target" position={Position.Top} />

            <div className='w-full flex flex-row items-center  h-full text-clip text-sm font-roboto '>
                <div className='flex flex-row items-center gap-1'>
                    <span className='bg-indigo-700 text-white rounded-[2px] p-0.5'><Spline size={10} /></span>
                    <span className='text-[10px] text-foreground font-medium'>{data.node.label}</span>

                </div>

            </div>

            <Handle type="source" position={Position.Bottom} id={id} />
        </div>
    );
}




export {
    RootNode,
    PathNode,
    CustomNode,
    ConditionNode
}