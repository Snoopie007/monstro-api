'use client'

import { createContext, useReducer, ReactElement, useCallback, useContext, ReactNode } from "react";

import { LocationState } from "@subtrees/types/location";
import { MonstroPlan } from '@/types';

type StateType = {
    locationState: LocationState;
    tos: string | null;
    plans: MonstroPlan[];
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
    tos: string | null;
    children: ReactNode;
    plans: MonstroPlan[];
}

export const NewLocationProvider = ({ children, state, tos, plans }: NewLocationProviderProps): ReactElement => {
    return (
        <NewLocationContext.Provider value={useNewLocationContext({
            locationState: {
                ...state,
                planId: plans[0].id,
            },
            tos: tos,

            plans: plans,
        })}>
            {children}
        </NewLocationContext.Provider>
    );
}

type UseNewLocationHookType = {
    locationState: LocationState;
    updateLocationState: (locationState: LocationState) => void;
    tos: string | null;
    plans: MonstroPlan[];
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
    };
}