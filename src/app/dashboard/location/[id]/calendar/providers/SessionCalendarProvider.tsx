'use client'
import { CalendarEvent } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    currentDate: Date;
    currentEvent: CalendarEvent | null;
}

const enum REDUCER_ACTION_TYPE {
    SET_CURRENT_DATE,
    SET_CURRENT_EVENT
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Date | CalendarEvent | null,
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_CURRENT_DATE:
            return { ...state, currentDate: action.payload as Date }
        case REDUCER_ACTION_TYPE.SET_CURRENT_EVENT:
            return { ...state, currentEvent: action.payload as CalendarEvent | null }
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

    return { state, setCurrentDate, setCurrentEvent }
}

type UseSessionCalendarContextType = ReturnType<typeof useSessionCalendarContext>

export const SessionCalendarContext = createContext<UseSessionCalendarContextType | null>(null)

type SessionCalendarProviderType = {
    initialDate?: Date;
    initialEvent?: CalendarEvent | null;
    children?: ReactElement | ReactElement[] | undefined
}

export const SessionCalendarProvider = ({
    initialDate = new Date(),
    initialEvent = null,
    children
}: SessionCalendarProviderType): ReactElement => {
    return (
        <SessionCalendarContext.Provider value={useSessionCalendarContext({
            currentDate: initialDate,
            currentEvent: initialEvent
        })}>
            {children}
        </SessionCalendarContext.Provider>
    )
}

type UseSessionCalendarHookType = {
    currentDate: Date;
    currentEvent: CalendarEvent | null;
    setCurrentDate: (date: Date) => void;
    setCurrentEvent: (event: CalendarEvent | null) => void;
}

export const useSessionCalendar = (): UseSessionCalendarHookType => {
    const context = useContext(SessionCalendarContext)
    if (!context) {
        throw new Error('useSessionCalendar must be used within a SessionCalendarProvider')
    }
    const { state: { currentDate, currentEvent }, setCurrentDate, setCurrentEvent } = context
    return {
        currentDate,
        currentEvent,
        setCurrentDate,
        setCurrentEvent
    }
}