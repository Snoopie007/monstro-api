'use client'
import supabase from "@/libs/client/supabase";
import { createContext, useContext, ReactElement, ReactNode, useEffect, useReducer } from "react";
import { LocationState } from "@/types/location";
import { useSession } from "next-auth/react";

type StateType = {
    locationState: LocationState;
}

type Action = { type: 'UPDATE_LOCATION_STATE'; payload: LocationState }

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case 'UPDATE_LOCATION_STATE': return { ...state, locationState: action.payload }
        default: return state
    }
}

export const AccountStatusContext = createContext<{
    state: StateType;
    dispatch: React.Dispatch<Action>;
} | null>(null)

interface AccountStatusProviderProps {
    children: ReactNode;
    locationState: LocationState;
}

export const AccountStatusProvider = ({ children, locationState }: AccountStatusProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, {
        locationState: locationState
    });

    useEffect(() => {

        if (!locationState) return;

        const channel = supabase.channel('db-changes')
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'location_state',
                    filter: `location_id=eq.${(locationState.locationId)}`,
                },
                (payload) => {
                    console.log("payload", payload)
                    dispatch({ type: 'UPDATE_LOCATION_STATE', payload: payload.new as LocationState })
                }
            ).subscribe()

        return () => {
            channel.unsubscribe();
        }
    }, [supabase, locationState])

    return (
        <AccountStatusContext.Provider value={{ state, dispatch }}>
            {children}
        </AccountStatusContext.Provider>
    );
}

type UseAccountStatusHookType = {
    locationState: LocationState;
}

export const useAccountStatus = (): UseAccountStatusHookType => {
    const context = useContext(AccountStatusContext)
    if (!context) {
        throw new Error('useAccountStatus must be used within a AccountStatusProvider')
    }

    const { state } = context;

    return {
        locationState: state.locationState
    };
}