'use client';
import { AIBot, FieldOptionGroup, NodeSettings, PartialNodeSettings } from "@/types";
import { Integration } from "@/types";
import { Edge } from "@xyflow/react";
import { HierarchyNode, stratify } from "d3-hierarchy";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useReducer
} from "react";

enum ActionType {
    SET_HIERARCHY,
    SET_CHANGES,
    UPDATE_INVALID_NODES,
    REMOVE_INVALID_NODE,
    SET_CURRENT_NODE,
    SET_CURRENT_EDGE,
    UPDATE_VARIABLES,
    SET_PARTNER_DATA
}


type StateType = {
    hierarchy: HierarchyNode<NodeSettings> | null
    changed: boolean
    variables: FieldOptionGroup[]
    currentNode: PartialNodeSettings | null
    currentEdge: Edge | null
    integrations: Integration[] | undefined
    partnerData: Record<string, any>
    invalidNodes: string[]
}

const initState: StateType = {
    hierarchy: null,
    changed: false,
    variables: [],
    currentNode: null,
    currentEdge: null,
    integrations: undefined,
    partnerData: {},
    invalidNodes: []
}

type ReducerAction = {
    type: ActionType,
    payload?: any
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case ActionType.SET_CURRENT_NODE:
            return { ...state, currentNode: action.payload }
        case ActionType.SET_CURRENT_EDGE:
            return { ...state, currentEdge: action.payload }
        case ActionType.SET_CHANGES:
            return { ...state, changed: action.payload }
        case ActionType.SET_HIERARCHY:
            return { ...state, hierarchy: action.payload }
        case ActionType.UPDATE_INVALID_NODES:
            return { ...state, invalidNodes: action.payload }
        case ActionType.REMOVE_INVALID_NODE:
            return { ...state, invalidNodes: action.payload }
        case ActionType.UPDATE_VARIABLES:
            return { ...state, variables: action.payload }
        case ActionType.SET_PARTNER_DATA:
            return { ...state, partnerData: action.payload }
        default:
            throw new Error("Unknown action type")
    }
}

const AIBotContextReturns = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState);

    const setCurrentNode = useCallback((node: PartialNodeSettings | null) => {
        dispatch({ type: ActionType.SET_CURRENT_NODE, payload: node })
    }, []);

    const setCurrentEdge = useCallback((edge: Edge | null) => {
        dispatch({ type: ActionType.SET_CURRENT_EDGE, payload: edge })
    }, []);

    const setHierarchy = useCallback((hierarchy: HierarchyNode<NodeSettings>) => {
        dispatch({ type: ActionType.SET_CURRENT_NODE, payload: null })
        dispatch({ type: ActionType.SET_HIERARCHY, payload: hierarchy })
    }, []);

    const hasChanged = useCallback((change: boolean) => {
        dispatch({ type: ActionType.SET_CHANGES, payload: change })
    }, []);

    const updateInvalidNodes = useCallback((nodeIds: string[]) => {
        const uniqueNodeIds = [...new Set([...state.invalidNodes, ...nodeIds])];
        dispatch({ type: ActionType.UPDATE_INVALID_NODES, payload: uniqueNodeIds })
    }, [state.invalidNodes]);

    const removeInvalidNode = useCallback((nodeId: string) => {
        dispatch({ type: ActionType.REMOVE_INVALID_NODE, payload: state.invalidNodes.filter(id => id !== nodeId) })
    }, [state.invalidNodes]);

    const updateVariables = useCallback((variables: Record<string, any>) => {
        dispatch({ type: ActionType.UPDATE_VARIABLES, payload: variables })
    }, []);

    const setPartnerData = useCallback((partnerData: Record<string, any>) => {
        dispatch({ type: ActionType.SET_PARTNER_DATA, payload: partnerData })
    }, []);

    return {
        state,
        setHierarchy,
        setCurrentNode,
        setCurrentEdge,
        hasChanged,
        updateInvalidNodes,
        removeInvalidNode,
        updateVariables,
        setPartnerData
    }
}

type AIBotContextType = ReturnType<typeof AIBotContextReturns>

const AIBotContext = createContext<AIBotContextType>({
    state: initState,
    setHierarchy: () => { },
    setCurrentNode: () => { },
    setCurrentEdge: () => { },
    hasChanged: () => { },
    updateInvalidNodes: () => { },
    removeInvalidNode: () => { },
    updateVariables: () => { },
    setPartnerData: () => { }
})

interface AIBotProviderProps {
    children: ReactNode,
    bot: AIBot | undefined,
    integrations: Integration[] | undefined,
}

const DEFAULT_START_NODES: NodeSettings[] = [{
    id: "start", node: { label: "Start" }, type: "start", position: { x: 0, y: 0 }
}, {
    id: "end", node: { label: "End" }, type: "end", position: { x: 0, y: 100 }, parentId: "start"
}]

export function AIBotProvider({ children, bot, integrations }: AIBotProviderProps) {
    if (!bot) {
        throw new Error("Bot not found")
    }
    const objectives = bot.objectives || DEFAULT_START_NODES;
    const hierarchy = stratify<NodeSettings>()(objectives);

    return (
        <AIBotContext.Provider value={AIBotContextReturns({ ...initState, hierarchy, integrations, invalidNodes: bot.invalidNodes })}>
            {children}
        </AIBotContext.Provider>
    )
}

export function useHierarchy() {
    const { state: { hierarchy }, setHierarchy } = useContext(AIBotContext);

    if (!hierarchy) {
        throw new Error("Hierarchy not found")
    }

    return { hierarchy, setHierarchy };
}

export function useBotBuilder() {
    const {
        state: { currentNode, changed, currentEdge, invalidNodes, integrations, variables, partnerData },
        hasChanged,
        setCurrentNode,
        setCurrentEdge,
        updateInvalidNodes,
        removeInvalidNode,
        updateVariables,
        setPartnerData
    } = useContext(AIBotContext);



    return {
        integrations,
        changed,
        hasChanged,
        setCurrentNode,
        currentNode,
        currentEdge,
        setCurrentEdge,
        invalidNodes,
        updateInvalidNodes,
        removeInvalidNode,
        variables,
        updateVariables,
        partnerData,
        setPartnerData
    };
}