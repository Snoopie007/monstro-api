'use client'
import { createContext, useContext, ReactElement, ReactNode, useReducer } from "react";


type LoginUser = {
    id: number;
    name: string;
    email: string;
    phone: string;
}

type StateType = {
    step: number;
    user: LoginUser | null;
}

type Action =
    | { type: 'SET_STEP'; payload: number }
    | { type: 'SET_USER'; payload: LoginUser | null }

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'SET_STEP': return { ...state, step: action.payload }
        case 'SET_USER': return { ...state, user: action.payload }
        default: return state
    }
}

export const LoginContext = createContext<{
    state: StateType;
    dispatch: React.Dispatch<Action>;
} | null>(null)

interface LoginProviderProps {
    children: ReactNode;
}

export const LoginProvider = ({ children }: LoginProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, { step: 1, user: null });


    return (
        <LoginContext.Provider value={{ state, dispatch }}>
            {children}
        </LoginContext.Provider>
    );
};

type UseLoginHookType = {
    step: number;
    user: LoginUser | null;
    setStep: (step: number) => void;
    setUser: (user: LoginUser | null) => void;
}

export const useLogin = (): UseLoginHookType => {
    const context = useContext(LoginContext)
    if (!context) {
        throw new Error('useLogin must be used within a LoginProvider')
    }

    const { state, dispatch } = context;

    const setStep = (step: number) => {
        dispatch({ type: 'SET_STEP', payload: step });
    };

    const setUser = (user: LoginUser | null) => {
        dispatch({ type: 'SET_USER', payload: user });
    };

    return {
        step: state.step,
        user: state.user,
        setStep,
        setUser
    };
}