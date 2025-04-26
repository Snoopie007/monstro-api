'use client'

import React, { MouseEvent, useState } from 'react'

import { BiDotsVerticalRounded } from 'react-icons/bi';
import { NodeProps } from '@xyflow/system';
import { NodeDataType, NodeSettings } from '@/types';
import { Node, useReactFlow } from '@xyflow/react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useBotBuilder, useHierarchy } from '../providers/AIBotProvider';
import { stratify } from 'd3-hierarchy';
import { endNodeTemplate } from '../data/templates';
import { generateNodeId } from '../data/utils';

interface NodeActionsProps {
    currentNode: NodeProps<Node<NodeDataType>>;
}

export default function NodeActions({ currentNode }: NodeActionsProps) {
    const [open, setOpen] = useState(false);
    const { hasChanged } = useBotBuilder()
    const { setNodes } = useReactFlow();
    const { hierarchy, setHierarchy } = useHierarchy();

    function remove(e: MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        setOpen(false);

        if (hierarchy) {
            const updatedHierarchy: NodeSettings[] = [];
            const updatedNodes: Node[] = [];
            const current = hierarchy.find((node) => node.id === currentNode.id);
            if (!current) return;
            let childNodeId = current.children?.[0]?.id;

            for (const n of hierarchy) {
                if (n.id === currentNode.id) {
                    if (current.data.type === "condition") {
                        const { data: { node }, ...rest } = {
                            id: generateNodeId(),
                            ...endNodeTemplate,
                            parentId: current.parent?.id
                        }
                        updatedHierarchy.push({ node, ...rest });
                        updatedNodes.push({
                            ...rest,
                            data: { node: node }
                        })
                        break;
                    }
                    continue;
                };

                let groupParentId = n.data.node.groupParentId;

                if (groupParentId !== undefined && groupParentId === currentNode.id) {
                    childNodeId = n.children?.[0]?.id;
                    continue;
                }

                const { node, options, ...rest } = n.data;
                if (n.id === childNodeId) {
                    const parentId = current.parent?.id;
                    updatedNodes.push({
                        data: { node: node, ...options },
                        ...rest,
                        parentId
                    })
                    updatedHierarchy.push({ ...n.data, parentId })
                    continue;
                }

                updatedNodes.push({
                    data: { node: node, ...options }, ...rest
                })
                updatedHierarchy.push(n.data);
            }
            setHierarchy(stratify<NodeSettings>()(updatedHierarchy));
            setNodes(updatedNodes);

            hasChanged(true);
        }
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild >
                <span onClick={event => event.stopPropagation()} >
                    <BiDotsVerticalRounded onClick={event => event.stopPropagation()} size={12} className='text-indigo-700 dark:text-black' />
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' side='right' className=' rounded text-indigo-800'>
                <DropdownMenuLabel className='cursor-pointer hover:bg-indigo-950 rounded-xs hover:text-white'
                    onClick={() => { }}
                >
                    Copy
                </DropdownMenuLabel>
                <DropdownMenuLabel className='cursor-pointer hover:bg-indigo-950 rounded-xs hover:text-white'
                    onClick={remove}
                >
                    Delete
                </DropdownMenuLabel>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
