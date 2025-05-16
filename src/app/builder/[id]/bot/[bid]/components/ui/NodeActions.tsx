'use client'

import React, { MouseEvent, useCallback, useState } from 'react'

import { NodeProps } from '@xyflow/system';
import { NodeDataType } from '@/types';
import { Node } from '@xyflow/react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    Button
} from '@/components/ui';
import { useBotUpdate } from '../../providers';
import { EllipsisVertical, MoveHorizontal, Copy, Trash } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface NodeActionsProps {
    currentNode: NodeProps<Node<NodeDataType>>;
}

export default function NodeActions({ currentNode }: NodeActionsProps) {
    const [open, setOpen] = useState(false);
    const { getEdges, updateEdge } = useReactFlow()
    const { remove } = useBotUpdate()

    const moveNode = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const edges = getEdges()

        edges.forEach(edge => {
            if (edge.type === 'plus') {
                updateEdge(edge.id, {
                    type: 'move'
                })
            }
        })
    }, [currentNode]);

    const copyNode = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    }, [currentNode]);

    const removeNode = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setOpen(false);
        remove({ id: currentNode.id, data: { ...currentNode.data }, type: currentNode.type, position: { x: 0, y: 0 } });
    }, [currentNode]);

    const actions = [
        { icon: MoveHorizontal, label: 'Move', onClick: moveNode },
        { icon: Copy, label: 'Copy', onClick: copyNode },
        { icon: Trash, label: 'Delete', onClick: removeNode }
    ]


    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild >
                <Button variant='ghost' size='icon' className='size-6' onClick={event => event.stopPropagation()}>
                    <EllipsisVertical className='size-4 text-indigo-700 dark:text-black' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' side='right' >
                {actions.map(({ icon: Icon, label, onClick }) => (
                    <DropdownMenuLabel
                        key={label}
                        className='cursor-pointer flex text-xs items-center gap-2 hover:bg-foreground/5 rounded-xs hover:text-indigo-500'
                        onClick={onClick}
                    >
                        <Icon className='size-3' />
                        <span> {label}</span>
                    </DropdownMenuLabel>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
