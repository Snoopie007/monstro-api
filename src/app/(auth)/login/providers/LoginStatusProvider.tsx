'use client'
import { createContext, useContext, ReactElement, ReactNode, useReducer } from "react";


type LoginUser = {
    id: number;
    name: string;
    email: string;
    phone: string;
}

type LoginLocation = {
    id: string;
    status: string;
}

type StateType = {
    step: number;
    user: LoginUser | null;
    location: LoginLocation | null;
}

type Action =
    | { type: 'SET_STEP'; payload: number }
    | { type: 'SET_USER'; payload: LoginUser | null }
    | { type: 'SET_LOCATION'; payload: LoginLocation | null }

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'SET_STEP': return { ...state, step: action.payload }
        case 'SET_USER': return { ...state, user: action.payload }
        case 'SET_LOCATION': return { ...state, location: action.payload }
        default: return state
    }
}

export const LoginStatusContext = createContext<{
    state: StateType;
    dispatch: React.Dispatch<Action>;
} | null>(null)

interface LoginStatusProviderProps {
    children: ReactNode;
}

export const LoginStatusProvider = ({ children }: LoginStatusProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, { step: 1, user: null, location: null });


    return (
        <LoginStatusContext.Provider value={{ state, dispatch }}>
            {children}
        </LoginStatusContext.Provider>
    );
};

type UseLoginStatusHookType = {
    step: number;
    user: LoginUser | null;
    location: LoginLocation | null;
    setStep: (step: number) => void;
    setUser: (user: LoginUser | null) => void;
    setLocation: (location: LoginLocation | null) => void;
}

export const useLoginStatus = (): UseLoginStatusHookType => {
    const context = useContext(LoginStatusContext)
    if (!context) {
        throw new Error('useLoginStatus must be used within a LoginStatusProvider')
    }

    const { state, dispatch } = context;

    const setStep = (step: number) => {
        dispatch({ type: 'SET_STEP', payload: step });
    };

    const setUser = (user: LoginUser | null) => {
        dispatch({ type: 'SET_USER', payload: user });
    };

    const setLocation = (location: LoginLocation | null) => {
        dispatch({ type: 'SET_LOCATION', payload: location });
    };

    return {
        step: state.step,
        user: state.user,
        location: state.location,
        setStep,
        setUser,
        setLocation
    };
}