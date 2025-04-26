
import {
    EdgeProps,
    BaseEdge,
    getStraightPath,
    EdgeLabelRenderer,
} from '@xyflow/react';
import { Plus, Lock } from 'lucide-react';

export function PlusEdge(props: EdgeProps) {
    const { sourceX, sourceY, targetX, targetY } = props;
    const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY, });

    return (
        <>
            <BaseEdge id={props.id} path={edgePath} />
            <EdgeLabelRenderer>
                <button
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan p-0.5 cursor-pointer bg-gray-400 rounded-full hover:bg-indigo-950"
                >
                    <Plus size={12} className='stroke-white' />
                </button>

            </EdgeLabelRenderer>

        </>
    );
}

export function LockedEdge(props: EdgeProps) {
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
                    className="nodrag nopan  size-4 flex items-center justify-center bg-yellow-500 rounded-full "
                >
                    <Lock size={10} className='stroke-white ' />

                </div>
            </EdgeLabelRenderer>



        </>
    );
}
