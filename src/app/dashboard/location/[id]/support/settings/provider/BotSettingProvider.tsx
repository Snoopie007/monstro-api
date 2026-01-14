"use client"
import { getDefaultAssistantSettings } from '@/libs/utils';
import { Member, SupportAssistant, TestChatMessage } from '@/types';
import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';



type BotSettingState = {
    messages: TestChatMessage[];
    assistant: SupportAssistant | null;
    exists: boolean;
    member: Member | null;
};

type BotSettingAction =
    | { type: 'SET_MESSAGE'; payload: TestChatMessage | TestChatMessage[] | ((prev: TestChatMessage[]) => TestChatMessage[]) }
    | { type: 'RESET_MESSAGE' }
    | { type: 'SET_MEMBER'; payload: Member }
    | { type: 'SET_ASSISTANT'; payload: SupportAssistant }
    | { type: 'UPDATE_ASSISTANT'; payload: SupportAssistant | ((prev: SupportAssistant) => SupportAssistant) }
    | { type: 'SET_EXISTS'; payload: boolean }
const BotSettingContext = createContext<{
    state: BotSettingState;
    dispatch: React.Dispatch<BotSettingAction>;
} | undefined>(undefined);

const initialState: BotSettingState = {
    messages: [],
    assistant: null,
    exists: false,
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
        case 'SET_EXISTS':
            return {
                ...state,
                exists: action.payload as boolean
            };
        default:
            return state;
    }
}

interface BotSettingProviderProps {
    children: ReactNode;
    assistant: SupportAssistant | null | undefined;
    locationId: string;
}

export function BotSettingProvider({ children, assistant, locationId }: BotSettingProviderProps) {
    const [state, dispatch] = useReducer(reducer, initialState);
    useEffect(() => {
        if (assistant) {
            dispatch({ type: 'SET_ASSISTANT', payload: assistant });
            dispatch({ type: 'SET_EXISTS', payload: true });
        } else {
            const defaultAssistant = getDefaultAssistantSettings();
            dispatch({ type: 'SET_ASSISTANT', payload: {
                ...defaultAssistant,
                id: '',
                created: new Date(),
                updated: null,
                locationId: locationId,
                status: 'Draft',
                modelId: 'gpt-4o',
            } });
            dispatch({ type: 'SET_EXISTS', payload: false });
        }
    }, [assistant, locationId]);
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
    const { messages, member, assistant, exists } = state;

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

    function setExists(exists: boolean) {
        dispatch({ type: 'SET_EXISTS', payload: exists });
    }

    return {
        messages,
        member,
        assistant,
        setMessage,
        resetMessage,
        setMember,
        updateAssistant,
        exists,
        setExists
    };
}
