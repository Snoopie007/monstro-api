'use client'
import supabase from "@/libs/client/supabase";
import { LocationState } from "@subtrees/types/location";
import {
    createContext,
    Dispatch,
    ReactElement,
    ReactNode,
    useContext,
    useEffect, useReducer
} from "react";

type StateType = {
    locationState: LocationState;
}

type Action = { type: 'UPDATE_LOCATION_STATE'; payload: LocationState }

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'UPDATE_LOCATION_STATE':
            return { ...state, locationState: action.payload }
        default:
            return state
    }
}

export const AccountStatusContext = createContext<{
    state: StateType;
    dispatch: Dispatch<Action>;
} | null>(null)

interface AccountStatusProviderProps {
    children: ReactNode;
    locationState: LocationState;
}

type UseAccountStatusHookType = {
    locationState: LocationState;
    updateState: (action: LocationState | ((prev: LocationState) => LocationState)) => void;
}

export const AccountStatusProvider = ({
    children,
    locationState
}: AccountStatusProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, { locationState });

    useEffect(() => {
        if (!locationState) return;
        const channel = supabase.channel('LocationChanges' , {
            config: {
                private: true,
            }
        })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'location_state',
                filter: `location_id=eq.${locationState.locationId}`,
            }, (payload) => {
                const newStatus = payload.new.status;
                if (newStatus) {
                    document.documentElement.setAttribute('data-account-status', newStatus);
                    dispatch({ type: 'UPDATE_LOCATION_STATE', payload: payload.new as LocationState });
                }
            }).subscribe();
        return () => {
            channel.unsubscribe();
        }
    }, [locationState]);

    return (
        <AccountStatusContext.Provider value={{ state, dispatch }}>
            {children}
        </AccountStatusContext.Provider>
    );
}

export const useAccountStatus = (): UseAccountStatusHookType => {
    const context = useContext(AccountStatusContext);
    if (!context) {
        throw new Error('useAccountStatus must be used within a AccountStatusProvider')
    }

    const { state, dispatch } = context;

    const updateState = (action: LocationState | ((prev: LocationState) => LocationState)) => {
        if (typeof action === 'function') {
            // @ts-ignore
            dispatch({ type: 'UPDATE_LOCATION_STATE', payload: action(state.locationState) });
        } else {
            dispatch({ type: 'UPDATE_LOCATION_STATE', payload: action });
        }
    };

    return {
        locationState: state.locationState,
        updateState
    };
}