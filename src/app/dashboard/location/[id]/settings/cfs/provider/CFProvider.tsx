'use client'
import {
    createContext, useContext, ReactElement,
    ReactNode, useReducer
} from "react";
import { MemberField } from "@subtrees/types";

type StateType = {
    fields: MemberField[];
    selectedField: MemberField | null;
};

const enum REDUCER_ACTION_TYPE {
    SET_FIELDS,
    SET_SELECTED_FIELD,
}

type Action =
    | { type: REDUCER_ACTION_TYPE.SET_FIELDS; payload: MemberField[] }
    | { type: REDUCER_ACTION_TYPE.SET_SELECTED_FIELD; payload: MemberField | null };

const reducer = (state: StateType, action: Action): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_FIELDS:
            return { ...state, fields: action.payload }
        case REDUCER_ACTION_TYPE.SET_SELECTED_FIELD:
            return { ...state, selectedField: action.payload }
        default:
            return state;
    }
}

// --- Context for Custom Field state ---
export const CFContext = createContext<{
    state: StateType;
    setFields: (fields: MemberField[] | ((prev: MemberField[]) => MemberField[])) => void;
    setSelectedField: (field: MemberField | null) => void;
} | null>(null);

// --- Provider ---
interface CFProviderProps {
    children: ReactNode;
    initialFields: MemberField[];
}
export const CFProvider = ({ children, initialFields }: CFProviderProps): ReactElement => {
    const [state, dispatch] = useReducer(reducer, { fields: initialFields, selectedField: null });

    // Like setState: accepts value or updater fn
    const setFields = (value: MemberField[] | ((prev: MemberField[]) => MemberField[])) => {
        if (typeof value === "function") {
            dispatch({ type: REDUCER_ACTION_TYPE.SET_FIELDS, payload: value(state.fields) });
        } else {
            dispatch({ type: REDUCER_ACTION_TYPE.SET_FIELDS, payload: value });
        }
    };
    const setSelectedField = (field: MemberField | null) => {
        dispatch({ type: REDUCER_ACTION_TYPE.SET_SELECTED_FIELD, payload: field });
    };

    return (
        <CFContext.Provider value={{ state, setFields, setSelectedField }}>
            {children}
        </CFContext.Provider>
    );
};

type UseCFHookType = {
    fields: MemberField[];
    selectedField: MemberField | null;
    setFields: (fields: MemberField[] | ((prev: MemberField[]) => MemberField[])) => void;
    setSelectedField: (field: MemberField | null) => void;
}

export const useCustomFields = (): UseCFHookType => {
    const context = useContext(CFContext)
    if (!context) {
        throw new Error('useCustomFields must be used within a CFProvider')
    }

    const { state, setFields, setSelectedField } = context;

    return {
        fields: state.fields,
        selectedField: state.selectedField,
        setFields,
        setSelectedField
    };
}