'use client';
import { SupportAssistant, SupportConversation } from "@/types/support";
import {
    createContext,
    ReactNode,
    useCallback,
    useEffect,
    useContext,
    useReducer,
} from "react";

enum ActionType {
    SET_CURRENT,
    UPDATE_CONVERSATION,
    UPDATE_ASSISTANT,
}

type StateType = {
    current: SupportConversation | null
    conversations: SupportConversation[]
    assistant: SupportAssistant
}

const initState: StateType = {
    current: null,
    conversations: [],
    assistant: {} as SupportAssistant
}

type ReducerAction = {
    type: ActionType,
    payload?: SupportConversation | { id: string, data: Partial<SupportConversation> } | string | null | SupportAssistant
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case ActionType.SET_CURRENT:
            return { ...state, current: action.payload as SupportConversation }

        case ActionType.UPDATE_CONVERSATION: {
            const { id, data } = action.payload as { id: string, data: Partial<SupportConversation> };
            if (!state.conversations) return state;

            const updatedConversations = state.conversations.map(c =>
                c.id === id ? { ...c, ...data } as SupportConversation : c
            );

            const updatedCurrent = state.current?.id === id ?
                { ...state.current, ...data } as SupportConversation :
                state.current;

            return {
                ...state,
                conversations: updatedConversations,
                current: updatedCurrent
            }
        }

        case ActionType.UPDATE_ASSISTANT:
            return { ...state, assistant: action.payload as SupportAssistant }
        default:
            throw new Error("Unknown action type")
    }
}

const SupportContextReturns = (initialState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const setCurrentConversation = useCallback((conversation: SupportConversation | null) => {
        dispatch({ type: ActionType.SET_CURRENT, payload: conversation })
    }, []);

    const updateConversation = useCallback((id: string, data: Partial<SupportConversation>) => {
        dispatch({ type: ActionType.UPDATE_CONVERSATION, payload: { id, data } })
    }, []);

    const updateAssistant = useCallback((assistant: SupportAssistant) => {
        dispatch({ type: ActionType.UPDATE_ASSISTANT, payload: assistant })
    }, []);

    return {
        state,
        setCurrentConversation,
        updateConversation,
        updateAssistant,
    }
}

type SupportContextType = ReturnType<typeof SupportContextReturns>

export const SupportContext = createContext<SupportContextType>({
    state: initState,
    setCurrentConversation: () => { },
    updateConversation: () => { },
    updateAssistant: () => { }
})

interface SupportProviderProps {
    children: ReactNode
    assistant: SupportAssistant
}

export function SupportProvider({ children, assistant }: SupportProviderProps) {

    const currentConversation = assistant.conversations && assistant.conversations ? assistant.conversations[0] : null;
    const context = SupportContextReturns({
        current: currentConversation,
        conversations: assistant.conversations || [],
        assistant: assistant
    });

    useEffect(() => {
        // Real-time subscription logic for conversations can be added here
        // For now, this is a placeholder
    }, [context]);

    return (
        <SupportContext.Provider value={context}>
            {children}
        </SupportContext.Provider>
    )
}

export function useSupport() {
    const { state, setCurrentConversation, updateConversation, updateAssistant } = useContext(SupportContext);
    const { current, conversations, assistant } = state;

    return {
        current,
        setCurrent: setCurrentConversation,
        conversations,
        updateConversation,
        assistant,
        updateAssistant
    };
}
