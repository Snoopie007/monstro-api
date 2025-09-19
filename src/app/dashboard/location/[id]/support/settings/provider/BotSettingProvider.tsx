"use client"
import { Member, SupportAssistant, TestChatMessage } from '@/types';
import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';



type BotSettingState = {
    messages: TestChatMessage[];
    assistant: SupportAssistant | null;
    sessionId: string;
    member: Member | null;
};

type BotSettingAction =
    | { type: 'SET_MESSAGE'; payload: TestChatMessage | TestChatMessage[] | ((prev: TestChatMessage[]) => TestChatMessage[]) }
    | { type: 'RESET_MESSAGE' }
    | { type: 'SET_MEMBER'; payload: Member }
    | { type: 'SET_ASSISTANT'; payload: SupportAssistant }
    | { type: 'UPDATE_ASSISTANT'; payload: SupportAssistant | ((prev: SupportAssistant) => SupportAssistant) }

const BotSettingContext = createContext<{
    state: BotSettingState;
    dispatch: React.Dispatch<BotSettingAction>;
} | undefined>(undefined);

const initialState: BotSettingState = {
    messages: [],
    assistant: null,
    sessionId: Math.random().toString(36).substring(7),
    member: null
};

function reducer(state: BotSettingState, action: BotSettingAction): BotSettingState {
    switch (action.type) {
        case 'SET_MESSAGE':
            if (typeof action.payload === 'function') {
                const newMessages = action.payload(state.messages);
                return {
                    ...state,
                    messages: newMessages
                };
            }
            if (Array.isArray(action.payload)) {
                return {
                    ...state,
                    messages: action.payload
                };
            }
            return {
                ...state,
                messages: [...state.messages, action.payload]
            };
        case 'RESET_MESSAGE':
            return {
                ...state,
                messages: [],
                sessionId: Math.random().toString(36).substring(7)
            };
        case 'SET_MEMBER':
            return {
                ...state,
                member: action.payload
            };
        case 'SET_ASSISTANT':
            return {
                ...state,
                assistant: action.payload
            };
        case 'UPDATE_ASSISTANT':
            if (typeof action.payload === 'function' && state.assistant) {
                const updatedAssistant = action.payload(state.assistant);
                return {
                    ...state,
                    assistant: updatedAssistant
                };
            }
            return {
                ...state,
                assistant: action.payload as SupportAssistant
            };
        default:
            return state;
    }
}

interface BotSettingProviderProps {
    children: ReactNode;
    assistant: SupportAssistant;
}

export function BotSettingProvider({ children, assistant }: BotSettingProviderProps) {
    const [state, dispatch] = useReducer(reducer, initialState);
    useEffect(() => {
        console.log('assistant set in context', assistant)
        dispatch({ type: 'SET_ASSISTANT', payload: assistant });
    }, [assistant]);
    return (
        <BotSettingContext.Provider value={{ state, dispatch }}>
            {children}
        </BotSettingContext.Provider>
    );
}

export function useBotSettingContext() {
    const context = useContext(BotSettingContext);
    if (context === undefined) {
        throw new Error('useBotSettingContext must be used within a BotSettingProvider');
    }
    const { state, dispatch } = context;
    const { messages, sessionId, member, assistant } = state;

    function setMessage(message: TestChatMessage | TestChatMessage[] | ((prev: TestChatMessage[]) => TestChatMessage[])) {
        dispatch({ type: 'SET_MESSAGE', payload: message });
    }

    function setMember(member: Member) {
        dispatch({ type: 'SET_MEMBER', payload: member });
    }

    function resetMessage() {
        dispatch({ type: 'RESET_MESSAGE' });
    }

    function updateAssistant(assistant: SupportAssistant | ((prev: SupportAssistant) => SupportAssistant)) {
        dispatch({ type: 'UPDATE_ASSISTANT', payload: assistant });
    }

    return {
        messages,
        sessionId,
        member,
        assistant,
        setMessage,
        resetMessage,
        setMember,
        updateAssistant
    };
}
