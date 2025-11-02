'use client'
import supabase from "@/libs/client/supabase";
import {
    createContext, useContext, ReactElement,
    ReactNode, useEffect, useReducer
} from "react";
import { LocationState } from "@/types/location";
import { useSession } from "next-auth/react";
import { LocationStatus } from "@/types";

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
    const [state, dispatch] = useReducer(reducer, { locationState });
    const { data: session, update } = useSession();

    function updateLocations(newStatus: LocationStatus | undefined) {

        if (!newStatus) return;
        update({
            locations: session?.user.locations.map((location: { id: string, status: LocationStatus }) => {
                return location.id === locationState.locationId
                    ? { ...location, status: newStatus }
                    : location
            })
        });
        document.documentElement.setAttribute('data-account-status', newStatus);
    };


    useEffect(() => {
        if (!locationState) return;
        const channel = supabase.channel('LocationChanges')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'location_state',
                filter: `location_id=eq.${locationState.locationId}`,
            }, (payload) => {
                const newStatus = payload.new.status;
                updateLocations(newStatus);
                dispatch({ type: 'UPDATE_LOCATION_STATE', payload: payload.new as LocationState });
            }).subscribe();
        return () => {
            channel.unsubscribe();
        };
    }, [locationState]);

    return (
        <AccountStatusContext.Provider value={{ state, dispatch }}>
            {children}
        </AccountStatusContext.Provider>
    );
};

type UseAccountStatusHookType = {
    locationState: LocationState;
    updateLocationState: (newState: LocationState) => void;
}

export const useAccountStatus = (): UseAccountStatusHookType => {
    const context = useContext(AccountStatusContext)
    if (!context) {
        throw new Error('useAccountStatus must be used within a AccountStatusProvider')
    }

    const { state, dispatch } = context;

    const updateLocationState = (newState: LocationState) => {
        dispatch({ type: 'UPDATE_LOCATION_STATE', payload: newState });
    };

    return {
        locationState: state.locationState,
        updateLocationState
    };
}