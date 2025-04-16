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

const useNewLocationContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState);

    const updateLocationState = useCallback((locationState: LocationState) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_LOCATION_STATE,
            payload: locationState
        });
    }, []);

    return { state, updateLocationState };
}

type UseNewLocationContextType = ReturnType<typeof useNewLocationContext>

export const NewLocationContext = createContext<UseNewLocationContextType | null>(null)

interface NewLocationProviderProps {
    state: LocationState;
    tos: MonstroLegal | undefined;
    children: ReactNode;
    plans: MonstroPlan[];
    packages: MonstroPackage[];
}

export const NewLocationProvider = ({ children, state, tos, plans, packages }: NewLocationProviderProps): ReactElement => {
    return (
        <NewLocationContext.Provider value={useNewLocationContext({
            locationState: state,
            tos: tos,
            plans: plans,
            packages: packages
        })}>
            {children}
        </NewLocationContext.Provider>
    );
}

type UseNewLocationHookType = {
    locationState: LocationState;
    updateLocationState: (locationState: LocationState) => void;
    tos: MonstroLegal | undefined;
    plans: MonstroPlan[];
    packages: MonstroPackage[];
}

export const useNewLocation = (): UseNewLocationHookType => {
    const context = useContext(NewLocationContext)
    if (!context) {
        throw new Error('useNewLocation must be used within a NewLocationProvider')
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