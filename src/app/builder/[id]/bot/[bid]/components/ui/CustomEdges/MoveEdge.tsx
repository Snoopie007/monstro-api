
import { cn } from '@/libs/utils';
import {
    EdgeProps,
    BaseEdge,
    getStraightPath,
    EdgeLabelRenderer,
} from '@xyflow/react';
import { SquareDashedMousePointer } from 'lucide-react';

export default function MoveEdge(props: EdgeProps) {
    const { sourceX, sourceY, targetX, targetY } = props;
    const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY, });

    return (
        <>
            <BaseEdge id={props.id} path={edgePath} style={{
                stroke: '#c5a0ff',
                strokeDasharray: '3 1',
            }} />
            <EdgeLabelRenderer >
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className={cn(
                        "nodrag nopan h-4 w-auto px-2 flex items-center text-xs justify-center bg-background rounded-xs gap-0.5 ",
                        " text-foreground/70"
                    )}
                >
                    <SquareDashedMousePointer size={8} />
                    <span className='text-[0.4rem] font-medium'>Move</span>
                </div>
            </EdgeLabelRenderer>



        </>
    );
}
