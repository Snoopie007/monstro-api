'use client'
import { createContext, useContext, ReactElement, ReactNode, useReducer } from "react";

type NewUser = {
    email: string;
    password: string;
}

type StateType = {
    user: NewUser | null;
}

type Action =
    | { type: 'SET_USER'; payload: NewUser | null }

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'SET_USER': return { ...state, user: action.payload }
        default: return state
    }
}

export const JoinContext = createContext<{
    state: StateType;
    dispatch: React.Dispatch<Action>;
} | null>(null)

interface JoinProviderProps {
    children: ReactNode;
}

export const JoinProvider = ({ children }: JoinProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, { user: null });


    return (
        <JoinContext.Provider value={{ state, dispatch }}>
            {children}
        </JoinContext.Provider>
    );
};

type UseJoinHookType = {
    user: NewUser | null;
    setUser: (user: NewUser | null) => void;
}

export const useJoin = (): UseJoinHookType => {
    const context = useContext(JoinContext)
    if (!context) {
        throw new Error('useJoin must be used within a JoinProvider')
    }

    const { state, dispatch } = context;

    const setUser = (user: NewUser | null) => {
        dispatch({ type: 'SET_USER', payload: user });
    };

    return {
        user: state.user,
        setUser
    };
}