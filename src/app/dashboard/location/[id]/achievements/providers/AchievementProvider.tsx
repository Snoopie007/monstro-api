'use client'
import { Achievement } from "@subtrees/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    achievements: Achievement[];
}

const enum REDUCER_ACTION_TYPE {
    SET_ACHIEVEMENTS,
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE;
    payload: Achievement[] | ((prev: Achievement[]) => Achievement[]);
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_ACHIEVEMENTS:
            const newAchievements = typeof action.payload === 'function'
                ? (action.payload as ((prev: Achievement[]) => Achievement[]))(state.achievements)
                : action.payload as Achievement[]
            return { ...state, achievements: newAchievements }
        default:
            throw new Error()
    }
}

const useAchievementContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const setAchievements = useCallback((achievements: Achievement[] | ((prev: Achievement[]) => Achievement[])) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_ACHIEVEMENTS,
            payload: achievements
        })
    }, [])

    return { state, setAchievements }
}

type UseAchievementContextType = ReturnType<typeof useAchievementContext>

export const AchievementContext = createContext<UseAchievementContextType | null>(null)

type AchievementProviderType = {
    achievements: Achievement[],
    children?: ReactElement | ReactElement[] | undefined
}

export const AchievementProvider = ({
    achievements,
    children
}: AchievementProviderType): ReactElement => {
    return (
        <AchievementContext.Provider value={useAchievementContext({ achievements })}>
            {children}
        </AchievementContext.Provider>
    )
}

type UseAchievementsHookType = {
    achievements: Achievement[];
    setAchievements: (achievements: Achievement[] | ((prev: Achievement[]) => Achievement[])) => void;
}

export const useAchievements = (): UseAchievementsHookType => {
    const context = useContext(AchievementContext)
    if (!context) {
        throw new Error('useAchievements must be used within an AchievementProvider')
    }
    const { state: { achievements }, setAchievements } = context

    return {
        achievements,
        setAchievements,
    }
}