'use client'
import { CalendarEvent } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    currentDate: Date;
    currentMonth: number | null;
    currentEvent: CalendarEvent | null;
    isLoading: boolean;
}

const enum REDUCER_ACTION_TYPE {
    SET_CURRENT_DATE,
    SET_CURRENT_MONTH,
    SET_CURRENT_EVENT,
    SET_IS_LOADING
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Date | CalendarEvent | null | number | boolean,
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_CURRENT_DATE:
            return { ...state, currentDate: action.payload as Date }
        case REDUCER_ACTION_TYPE.SET_CURRENT_EVENT:
            return { ...state, currentEvent: action.payload as CalendarEvent | null }
        case REDUCER_ACTION_TYPE.SET_CURRENT_MONTH:
            return { ...state, currentMonth: action.payload as number | null }
        case REDUCER_ACTION_TYPE.SET_IS_LOADING:
            return { ...state, isLoading: action.payload as boolean }
        default:
            throw new Error()
    }
}

const useSessionCalendarContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const setCurrentDate = useCallback((date: Date) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_CURRENT_DATE,
            payload: date
        })
    }, [])

    const setCurrentEvent = useCallback((event: CalendarEvent | null) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_CURRENT_EVENT,
            payload: event
        })
    }, [])

    const setCurrentMonth = useCallback((month: number) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_CURRENT_MONTH,
            payload: month
        })
    }, [])

    const setIsLoading = useCallback((isLoading: boolean) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_IS_LOADING,
            payload: isLoading
        })
    }, [])

    return { state, setCurrentDate, setCurrentEvent, setCurrentMonth, setIsLoading }
}

type UseSessionCalendarContextType = ReturnType<typeof useSessionCalendarContext>

export const SessionCalendarContext = createContext<UseSessionCalendarContextType | null>(null)

type SessionCalendarProviderType = {
    initialDate: Date;
    initialEvent?: CalendarEvent | null;
    children?: ReactElement | ReactElement[] | undefined
}

export const SessionCalendarProvider = ({
    initialDate,
    initialEvent = null,
    children
}: SessionCalendarProviderType): ReactElement => {
    return (
        <SessionCalendarContext.Provider value={useSessionCalendarContext({
            currentDate: initialDate,
            currentEvent: initialEvent,
            currentMonth: null,
            isLoading: false
        })}>
            {children}
        </SessionCalendarContext.Provider>
    )
}

type UseSessionCalendarHookType = {
    currentDate: Date;
    currentEvent: CalendarEvent | null;
    currentMonth: number | null;
    isLoading: boolean;
    setCurrentDate: (date: Date) => void;
    setCurrentEvent: (event: CalendarEvent | null) => void;
    setCurrentMonth: (month: number) => void;
    setIsLoading: (isLoading: boolean) => void;
}

export const useSessionCalendar = (): UseSessionCalendarHookType => {
    const context = useContext(SessionCalendarContext)
    if (!context) {
        throw new Error('useSessionCalendar must be used within a SessionCalendarProvider')
    }
    const { state, setCurrentDate, setCurrentEvent, setCurrentMonth, setIsLoading } = context
    const { currentDate, currentEvent, currentMonth, isLoading } = state
    return {
        currentDate,
        currentEvent,
        currentMonth,
        isLoading,
        setCurrentDate,
        setCurrentEvent,
        setCurrentMonth,
        setIsLoading
    }
}