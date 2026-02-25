'use client';

import { useConversationListListener } from '@/hooks/useConversationListListener';
import { useSession } from "@/hooks/useSession";
import { clientsideApiClient } from "@/libs/api/client";
import { Chat, ChatMember } from "@subtrees/types/chat";
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useReducer,
} from "react";

// State definition
type StateType = {
    chats: Chat[];
    currentChat: Chat | null;
    isCurrentChatAtBottom: boolean;
}

const initialState: StateType = {
    chats: [],
    currentChat: null,
    isCurrentChatAtBottom: false,
}

// Action definitions using Discriminated Unions
type Action = 
    | { type: 'SET_CHATS'; payload: Chat[] }
    | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
    | { type: 'SET_CHAT_VIEWPORT'; payload: { chatId: string; isAtBottom: boolean } }
    | { type: 'UPDATE_CHAT_TIMESTAMP'; payload: { chatId: string; timestamp: string } }
    | { type: 'UPDATE_CHAT_MEMBER'; payload: { chatId: string; userId: string; update: Partial<ChatMember> } }
    | { type: 'INCREMENT_UNREAD'; payload: { chatId: string; userId: string } }
    | { type: 'ADD_CHAT'; payload: Chat }

// Reducer
const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'SET_CHATS':
            return { ...state, chats: action.payload }
        case 'SET_CURRENT_CHAT':
            return { ...state, currentChat: action.payload, isCurrentChatAtBottom: false }
        case 'SET_CHAT_VIEWPORT': {
            const { chatId, isAtBottom } = action.payload;
            if (state.currentChat?.id !== chatId) return state;
            if (state.isCurrentChatAtBottom === isAtBottom) return state;
            return { ...state, isCurrentChatAtBottom: isAtBottom };
        }
        case 'UPDATE_CHAT_TIMESTAMP': {
            const { chatId, timestamp } = action.payload;
            const chatIndex = state.chats.findIndex(c => c.id === chatId);
            
            if (chatIndex === -1) return state;
            
            const updatedChats = [...state.chats];
            updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                updated: new Date(timestamp)
            };
            
            // Sort by updated timestamp (newest first)
            updatedChats.sort((a, b) => {
                const aTime = new Date(a.updated || a.created).getTime();
                const bTime = new Date(b.updated || b.created).getTime();
                return bTime - aTime;
            });
            
            return { ...state, chats: updatedChats };
        }
        case 'UPDATE_CHAT_MEMBER': {
            const { chatId, userId, update } = action.payload;
            const chats = state.chats.map(chat => {
                if (chat.id !== chatId || !chat.chatMembers) return chat;
                return {
                    ...chat,
                    chatMembers: chat.chatMembers.map(member =>
                        member.userId === userId ? { ...member, ...update } : member
                    ),
                };
            });

            const currentChat =
                state.currentChat?.id === chatId && state.currentChat.chatMembers
                    ? {
                        ...state.currentChat,
                        chatMembers: state.currentChat.chatMembers.map(member =>
                            member.userId === userId ? { ...member, ...update } : member
                        ),
                    }
                    : state.currentChat;

            return { ...state, chats, currentChat };
        }
        case 'INCREMENT_UNREAD': {
            const { chatId, userId } = action.payload;
            const chats = state.chats.map(chat => {
                if (chat.id !== chatId || !chat.chatMembers) return chat;
                return {
                    ...chat,
                    chatMembers: chat.chatMembers.map(member =>
                        member.userId === userId
                            ? { ...member, unreadCount: (member.unreadCount ?? 0) + 1 }
                            : member
                    ),
                };
            });

            const currentChat =
                state.currentChat?.id === chatId && state.currentChat.chatMembers
                    ? {
                        ...state.currentChat,
                        chatMembers: state.currentChat.chatMembers.map(member =>
                            member.userId === userId
                                ? { ...member, unreadCount: (member.unreadCount ?? 0) + 1 }
                                : member
                        ),
                    }
                    : state.currentChat;

            return { ...state, chats, currentChat };
        }
        case 'ADD_CHAT': {
            const newChat = action.payload;
            if (state.chats.some(c => c.id === newChat.id)) return state;
            
            return { 
                ...state, 
                chats: [newChat, ...state.chats] 
            };
        }
        default:
            return state;
    }
}

// Context Type
interface GroupsContextType {
    state: StateType;
    setChats: (chats: Chat[]) => void;
    setCurrentChat: (chat: Chat | null) => void;
    setCurrentChatViewport: (chatId: string, isAtBottom: boolean) => void;
    updateChatMember: (chatId: string, userId: string, update: Partial<ChatMember>) => void;
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
        currentChat: null,
        isCurrentChatAtBottom: false,
    });
    const { data: session } = useSession();

    const setChats = (chats: Chat[]) => {
        dispatch({ type: 'SET_CHATS', payload: chats });
    };

    const setCurrentChat = (chat: Chat | null) => {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    };

    const setCurrentChatViewport = useCallback((chatId: string, isAtBottom: boolean) => {
        dispatch({ type: 'SET_CHAT_VIEWPORT', payload: { chatId, isAtBottom } });
    }, []);
    
    const updateChatTimestamp = useCallback((chatId: string, timestamp: string) => {
        dispatch({ type: 'UPDATE_CHAT_TIMESTAMP', payload: { chatId, timestamp } });
    }, []);
    
    const addChat = useCallback((chat: Chat) => {
        dispatch({ type: 'ADD_CHAT', payload: chat });
    }, []);

    const updateChatMember = useCallback((chatId: string, userId: string, update: Partial<ChatMember>) => {
        dispatch({ type: 'UPDATE_CHAT_MEMBER', payload: { chatId, userId, update } });
    }, []);

    // Handle realtime updates
    const handleRealtimeUpdate = useCallback(async (payload: any) => {
        const { message } = payload;
        const chatId = message?.chatId;
        
        // Check if we have this conversation
        const exists = state.chats.some(c => c.id === chatId);
        
        if (exists) {
            // Update existing conversation timestamp to move it to top
            updateChatTimestamp(chatId, message?.created);

            if (
                message?.senderId &&
                session?.user?.id &&
                message.senderId !== session.user.id
            ) {
                const isActiveChat = state.currentChat?.id === chatId;
                const shouldIncrementUnread = !isActiveChat || !state.isCurrentChatAtBottom;

                if (!shouldIncrementUnread) {
                    return;
                }

                dispatch({
                    type: 'INCREMENT_UNREAD',
                    payload: { chatId, userId: session.user.id },
                });
            }
        } else {
            // New chat - fetch details
            try {
                const memberId = session?.user?.member?.id;
                if (!session?.user?.sbToken || !memberId) return;
                
                const api = clientsideApiClient(session.user.sbToken);
                // Fetch the single chat details
                // Note: Ideally API should return the Chat object shape expected by frontend
                const newChat = await api.get(`/protected/member/${memberId}/chats/${chatId}`);
                
                if (newChat) {
                    addChat(newChat as Chat);
                }
            } catch (err) {
                console.error('Failed to handle new chat:', err);
            }
        }
    }, [state.chats, state.currentChat?.id, state.isCurrentChatAtBottom, updateChatTimestamp, addChat, session?.user?.id, session?.user?.sbToken, session?.user?.member?.id]);

    useConversationListListener(handleRealtimeUpdate);

    const value = {
        state,
        setChats,
        setCurrentChat,
        setCurrentChatViewport,
        updateChatMember,
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
    
    const { state, setChats, setCurrentChat, setCurrentChatViewport, updateChatMember } = context;
    const { chats, currentChat, isCurrentChatAtBottom } = state;

    return {
        chats,
        currentChat,
        isCurrentChatAtBottom,
        setChats,
        setCurrentChat,
        setCurrentChatViewport,
        updateChatMember,
    };
}
