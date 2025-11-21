'use client';

import { Chat } from "@/types/chats";
import {
    createContext,
    ReactNode,
    useContext,
    useReducer,
} from "react";

// State definition
type StateType = {
    chats: Chat[];
    currentChat: Chat | null;
}

const initialState: StateType = {
    chats: [],
    currentChat: null
}

// Action definitions using Discriminated Unions
type Action = 
    | { type: 'SET_CHATS'; payload: Chat[] }
    | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }

// Reducer
const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'SET_CHATS':
            return { ...state, chats: action.payload }
        case 'SET_CURRENT_CHAT':
            return { ...state, currentChat: action.payload }
        default:
            return state;
    }
}

// Context Type
interface GroupsContextType {
    state: StateType;
    setChats: (chats: Chat[]) => void;
    setCurrentChat: (chat: Chat | null) => void;
}

// Create Context
export const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

interface GroupsProviderProps {
    children: ReactNode;
    chats: Chat[];
}

export function GroupsProvider({ children, chats }: GroupsProviderProps) {
    const [state, dispatch] = useReducer(reducer, {
        chats: chats,
        currentChat: null
    });

    const setChats = (chats: Chat[]) => {
        dispatch({ type: 'SET_CHATS', payload: chats });
    };

    const setCurrentChat = (chat: Chat | null) => {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    };

    const value = {
        state,
        setChats,
        setCurrentChat
    };

    return (
        <GroupsContext.Provider value={value}>
            {children}
        </GroupsContext.Provider>
    )
}

export function useGroups() {
    const context = useContext(GroupsContext);
    if (context === undefined) {
        throw new Error('useGroups must be used within a GroupsProvider');
    }
    
    const { state, setChats, setCurrentChat } = context;
    const { chats, currentChat } = state;

    return {
        chats,
        currentChat,
        setChats,
        setCurrentChat
    };
}
