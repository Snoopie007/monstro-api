'use client'
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    filters: Record<string, any>;
}

const enum REDUCER_ACTION_TYPE {
    SET_FILTERS
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Record<string, any>
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_FILTERS:
            return { ...state, filters: action.payload as Record<string, any> }
        default:
            throw new Error()
    }
}

const useReportContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const setFilters = useCallback((filters: Record<string, any>) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_FILTERS,
            payload: filters
        })
    }, [])

    return { state, setFilters }
}

type UseReportContextType = ReturnType<typeof useReportContext>

export const ReportContext = createContext<UseReportContextType | null>(null)


export const ReportProvider = ({ children }: { children: ReactElement }): ReactElement => {
    return (
        <ReportContext.Provider value={useReportContext({ filters: {} })} >
            {children}
        </ReportContext.Provider>
    );
}




type UseReportFiltersHookType = {
    filters: Record<string, any>,
    setFilters: (filters: Record<string, any>) => void
}

export const useReportFilters = (): UseReportFiltersHookType => {
    const context = useContext(ReportContext)
    if (!context) {
        throw new Error('useReportFilters must be used within a ReportProvider')
    }
    const { state: { filters }, setFilters } = context
    return { filters, setFilters }
}


