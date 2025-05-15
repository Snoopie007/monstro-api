'use client'

import { Handle, NodeProps, Position, Node } from '@xyflow/react';
import { cn } from '@/libs/utils';
import { NodeDataType } from '@/types';


export default function RootNode({ id, data }: NodeProps<Node<NodeDataType>>) {
    return (
        <div
            className={cn('rounded-xs border-black flex flex-row border  max-w-[40px] translate-x-[80px] h-[20px] items-center w-[40px] bg-foreground/10 ')}
            onClick={(e) => e.stopPropagation()}
        >
            {id !== "start" && <Handle type="target" position={Position.Top} />}
            <div className='w-full text-clip text-[8px] font-roboto text-foreground uppercase text-center '>
                {data.label}
            </div>
            {id !== "end" && <Handle
                type="source"
                position={Position.Bottom}
                id={id}

            />}

        </div>
    );
}



