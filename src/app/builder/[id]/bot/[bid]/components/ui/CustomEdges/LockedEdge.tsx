
import {
    EdgeProps,
    BaseEdge,
    getStraightPath,
    EdgeLabelRenderer,
} from '@xyflow/react';
import { Lock } from 'lucide-react';

export default function LockedEdge(props: EdgeProps) {
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
