import RootNode from './RootNode';
import ConditionNode from './ConitionNode';
import PathNode from './PathNode';
import StandardNode from './StandardNode';


export const NodeTypes = {
    'start': RootNode,
    'end': RootNode,
    'ai': StandardNode,
    'retrieval': StandardNode,
    'extraction': StandardNode,
    "condition": ConditionNode,
    "path": PathNode,
    "integration": StandardNode
};