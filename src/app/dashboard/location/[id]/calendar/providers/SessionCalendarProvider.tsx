'use client'
import { CalendarEvent } from "@/types/calendar";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"
import { DateRange } from "react-day-picker";

type StateType = {
    currentDate: Date;
    dateRange: DateRange | undefined;
    currentMonth: number | null;
    currentEvent: CalendarEvent | null;
    isLoading: boolean;
}

const enum REDUCER_ACTION_TYPE {
    SET_CURRENT_DATE,
    SET_DATE_RANGE,
    SET_CURRENT_MONTH,
    SET_CURRENT_EVENT,
    SET_IS_LOADING
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Date | CalendarEvent | null | number | boolean | DateRange,
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_CURRENT_DATE:
            return { ...state, currentDate: action.payload as Date }
        case REDUCER_ACTION_TYPE.SET_DATE_RANGE:
            return { ...state, dateRange: action.payload as DateRange | undefined }
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

    const setDateRange = useCallback((dateRange: DateRange | undefined) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_DATE_RANGE,
            payload: dateRange
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

    return { state, setCurrentDate, setDateRange, setCurrentEvent, setCurrentMonth, setIsLoading }
}

type UseSessionCalendarContextType = ReturnType<typeof useSessionCalendarContext>

export const SessionCalendarContext = createContext<UseSessionCalendarContextType | null>(null)

type SessionCalendarProviderType = {
    initialDate: Date;
    children: ReactElement
}

export const SessionCalendarProvider = ({
    initialDate,
    children
}: SessionCalendarProviderType): ReactElement => {
    return (
        <SessionCalendarContext.Provider value={useSessionCalendarContext({
            currentDate: initialDate,
            dateRange: undefined,
            currentEvent: null,
            currentMonth: null,
            isLoading: false
        })}>
            {children}
        </SessionCalendarContext.Provider>
    )
}

type UseSessionCalendarHookType = {
    currentDate: Date;
    dateRange: DateRange | undefined;
    currentEvent: CalendarEvent | null;
    currentMonth: number | null;
    isLoading: boolean;
    setCurrentDate: (date: Date) => void;
    setDateRange: (dateRange: DateRange | undefined) => void;
    setCurrentEvent: (event: CalendarEvent | null) => void;
    setCurrentMonth: (month: number) => void;
    setIsLoading: (isLoading: boolean) => void;
}

export const useSessionCalendar = (): UseSessionCalendarHookType => {
    const context = useContext(SessionCalendarContext)
    if (!context) {
        throw new Error('useSessionCalendar must be used within a SessionCalendarProvider')
    }
    const { state, setCurrentDate, setDateRange, setCurrentEvent, setCurrentMonth, setIsLoading } = context
    const { currentDate, dateRange, currentEvent, currentMonth, isLoading } = state
    return {
        currentDate,
        dateRange,
        currentEvent,
        currentMonth,
        isLoading,
        setCurrentDate,
        setDateRange,
        setCurrentEvent,
        setCurrentMonth,
        setIsLoading
    }
}