'use client';
import { Integration, NodeDataType, AIBot, FieldOptionGroup } from "@/types";
import { Edge, Node } from "@xyflow/react";
import { HierarchyNode, stratify } from "d3-hierarchy";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useReducer,
} from "react";

enum ActionType {
    SET_HIERARCHY,
    SET_CHANGES,
    UPDATE_INVALID_NODES,
    UPDATE_VARIABLES,
    SET_PARTNER_DATA,
    SET_CURRENT_NODE,
    SET_CURRENT_EDGE
}


type StateType = {
    hierarchy: HierarchyNode<Node<NodeDataType>> | null
    changed: boolean
    variables: FieldOptionGroup[]
    integrations: Integration[] | undefined
    partnerData: Record<string, any>
    invalidNodes: string[]
    currentNode: Node<NodeDataType> | null
    currentEdge: Edge | null
}

const initState: StateType = {
    hierarchy: null,
    changed: false,
    variables: [],
    integrations: undefined,
    partnerData: {},
    invalidNodes: [],
    currentNode: null,
    currentEdge: null
}

type ReducerAction = {
    type: ActionType,
    payload?: any
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case ActionType.SET_CHANGES:
            return { ...state, changed: action.payload }
        case ActionType.UPDATE_INVALID_NODES:
            return { ...state, invalidNodes: action.payload }
        case ActionType.UPDATE_VARIABLES:
            return { ...state, variables: action.payload }
        case ActionType.SET_PARTNER_DATA:
            return { ...state, partnerData: action.payload }
        case ActionType.SET_CURRENT_NODE:
            return { ...state, currentNode: action.payload }
        case ActionType.SET_CURRENT_EDGE:
            return { ...state, currentEdge: action.payload }
        case ActionType.SET_HIERARCHY:
            return { ...state, hierarchy: action.payload }
        default:
            throw new Error("Unknown action type")
    }
}


const AIBotContextReturns = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState);

    const hasChanged = useCallback((change: boolean) => {
        dispatch({ type: ActionType.SET_CHANGES, payload: change })
    }, []);

    const updateInvalidNodes = useCallback((nodeIds: string[] | ((prev: string[]) => string[])) => {
        if (typeof nodeIds === 'function') {
            const updatedNodes = nodeIds(state.invalidNodes);
            dispatch({ type: ActionType.UPDATE_INVALID_NODES, payload: updatedNodes });
        } else {
            const uniqueNodeIds = [...new Set([...state.invalidNodes, ...nodeIds])];
            dispatch({ type: ActionType.UPDATE_INVALID_NODES, payload: uniqueNodeIds });
        }
    }, [state.invalidNodes]);

    const updateVariables = useCallback((variables: Record<string, any>) => {
        dispatch({ type: ActionType.UPDATE_VARIABLES, payload: variables })
    }, []);

    const setPartnerData = useCallback((partnerData: Record<string, any>) => {
        dispatch({ type: ActionType.SET_PARTNER_DATA, payload: partnerData })
    }, []);

    const setCurrentNode = useCallback((node: Node<NodeDataType> | null) => {
        dispatch({ type: ActionType.SET_CURRENT_NODE, payload: node })
    }, []);

    const setCurrentEdge = useCallback((edge: Edge | null) => {
        dispatch({ type: ActionType.SET_CURRENT_EDGE, payload: edge })
    }, []);

    const setHierarchy = useCallback((hierarchy: HierarchyNode<Node<NodeDataType>> | null) => {
        dispatch({ type: ActionType.SET_HIERARCHY, payload: hierarchy })
    }, []);

    return {
        state,
        hasChanged,
        updateInvalidNodes,
        updateVariables,
        setPartnerData,
        setCurrentNode,
        setCurrentEdge,
        setHierarchy
    }
}

type AIBotContextType = ReturnType<typeof AIBotContextReturns>

export const AIBotContext = createContext<AIBotContextType>({
    state: initState,
    hasChanged: () => { },
    updateInvalidNodes: () => { },
    updateVariables: () => { },
    setPartnerData: () => { },
    setCurrentNode: () => { },
    setCurrentEdge: () => { },
    setHierarchy: () => { }
})

interface AIBotProviderProps {
    children: ReactNode,
    bot: AIBot | undefined,
    integrations: Integration[] | undefined,
}

export function AIBotProvider({ children, bot, integrations }: AIBotProviderProps) {
    if (!bot) {
        throw new Error("Bot not found")
    }

    const objectives = bot.objectives || [];

    const hierarchy = stratify<Node<NodeDataType>>()(objectives)


    return (
        <AIBotContext.Provider value={AIBotContextReturns({ ...initState, integrations, invalidNodes: bot.invalidNodes, hierarchy })}>
            {children}
        </AIBotContext.Provider>
    )
}



export function useBotBuilder() {
    const {
        state,
        hasChanged,
        updateVariables,
        setPartnerData,
    } = useContext(AIBotContext);

    const { integrations, changed, invalidNodes, variables, partnerData } = state;

    return {
        integrations,
        changed,
        hasChanged,
        invalidNodes,
        variables,
        updateVariables,
        partnerData,
        setPartnerData
    };
}

