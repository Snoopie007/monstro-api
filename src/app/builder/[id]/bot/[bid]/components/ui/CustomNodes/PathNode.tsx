'use client'

import { Handle, NodeProps, Position, Node } from '@xyflow/react';
import { cn } from '@/libs/utils';
import { NodeDataType } from '@/types';
import { Spline, } from 'lucide-react';


export default function PathNode({ id, data }: NodeProps<Node<NodeDataType>>) {
    return (
        <div className={cn('border-foreground w-[100px] translate-x-[50px] h-[30px]   px-2 bg-transparent border relative')}>
            <Handle type="target" position={Position.Top} />

            <div className='w-full flex flex-row items-center  h-full text-clip text-sm font-roboto '>
                <div className='flex flex-row items-center gap-1'>
                    <span className='bg-indigo-700 text-white rounded-[2px] p-0.5'><Spline size={10} /></span>
                    <span className='text-[10px] text-foreground font-medium'>{data.label}</span>

                </div>

            </div>

            <Handle type="source" position={Position.Bottom} id={id} />
        </div>
    );
}
