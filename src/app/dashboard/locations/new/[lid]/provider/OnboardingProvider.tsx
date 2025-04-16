'use client'

import { createContext, useReducer, ReactElement, useCallback, useContext, ReactNode } from "react";

import { LocationState } from "@/types/location";
import { MonstroLegal } from "@/libs/server/MDXParse";
import { MonstroPackage } from "@/types/admin";
import { MonstroPlan } from "@/types/admin";

type StateType = {
    locationState: LocationState;
    tos: MonstroLegal | undefined;
    plans: MonstroPlan[];
    packages: MonstroPackage[];
}

const enum REDUCER_ACTION_TYPE {
    UPDATE_LOCATION_STATE
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: LocationState
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.UPDATE_LOCATION_STATE:
            return { ...state, locationState: action.payload as LocationState }
        default:
            throw new Error();
    }
}

const useOnboardingContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState);

    const updateLocationState = useCallback((locationState: LocationState) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_LOCATION_STATE,
            payload: locationState
        });
    }, []);

    return { state, updateLocationState };
}

type UseOnboardingContextType = ReturnType<typeof useOnboardingContext>

export const OnboardingContext = createContext<UseOnboardingContextType | null>(null)

interface OnboardingProviderProps {
    state: LocationState;
    tos: MonstroLegal | undefined;
    children: ReactNode;
    plans: MonstroPlan[];
    packages: MonstroPackage[];
}

export const OnboardingProvider = ({ children, state, tos, plans, packages }: OnboardingProviderProps): ReactElement => {
    return (
        <OnboardingContext.Provider value={useOnboardingContext({
            locationState: state,
            tos: tos,
            plans: plans,
            packages: packages
        })}>
            {children}
        </OnboardingContext.Provider>
    );
}

type UseOnboardingHookType = {
    locationState: LocationState;
    updateLocationState: (locationState: LocationState) => void;
    tos: MonstroLegal | undefined;
    plans: MonstroPlan[];
    packages: MonstroPackage[];
}

export const useOnboarding = (): UseOnboardingHookType => {
    const context = useContext(OnboardingContext)
    if (!context) {
        throw new Error('useOnboarding must be used within a OnboardingProvider')
    }
    const { state, updateLocationState } = context;

    return {
        locationState: state.locationState,
        updateLocationState,
        tos: state.tos,
        plans: state.plans,
        packages: state.packages
    };
}