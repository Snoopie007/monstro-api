'use client'

import { createContext, useReducer, ReactElement, useCallback, useContext, ReactNode } from "react";

import { VendorOnboarding } from "@/types/vendor";


type StateType = {
    progress: VendorOnboarding;
}

const enum REDUCER_ACTION_TYPE {
    UPDATE_PROGRESS
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: number | Record<string, any>
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.UPDATE_PROGRESS:
            return { ...state, progress: action.payload as VendorOnboarding }
        default:
            throw new Error();
    }
}

const useOnboardingContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState);

    const updateProgress = useCallback((progress: Record<string, any>) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_PROGRESS,
            payload: progress
        });
    }, []);

    return { state, updateProgress };
}

type UseOnboardingContextType = ReturnType<typeof useOnboardingContext>

export const OnboardingContext = createContext<UseOnboardingContextType | null>(null)

interface OnboardingProviderProps {
    progress: VendorOnboarding;
    children: ReactNode;
}

export const OnboardingProvider = ({ children, progress }: OnboardingProviderProps): ReactElement => {
    return (
        <OnboardingContext.Provider value={useOnboardingContext({
            progress
        })}>
            {children}
        </OnboardingContext.Provider>
    );
}

type UseOnboardingHookType = {
    progress: VendorOnboarding;
    updateProgress: (progress: Record<string, any>) => void;
}

export const useOnboarding = (): UseOnboardingHookType => {
    const context = useContext(OnboardingContext)
    if (!context) {
        throw new Error('useOnboarding must be used within a OnboardingProvider')
    }
    const { state, updateProgress } = context;
    const { progress } = state;

    return {
        progress,
        updateProgress
    };
}