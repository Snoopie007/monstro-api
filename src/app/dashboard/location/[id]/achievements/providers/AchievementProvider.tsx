'use client'
import { Achievement, AchievementTrigger } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    achievements: Achievement[];
    currentAchievement: Achievement | null;
    triggers: AchievementTrigger[];
}

const enum REDUCER_ACTION_TYPE {
    SET_ACHIEVEMENTS,
    SET_CURRENT_ACHIEVEMENT,
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE;
    payload: Achievement[] | ((prev: Achievement[]) => Achievement[]) | Achievement | null;
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_ACHIEVEMENTS:
            const newAchievements = typeof action.payload === 'function'
                ? (action.payload as ((prev: Achievement[]) => Achievement[]))(state.achievements)
                : action.payload as Achievement[]
            return { ...state, achievements: newAchievements }
        case REDUCER_ACTION_TYPE.SET_CURRENT_ACHIEVEMENT:
            return { ...state, currentAchievement: action.payload as Achievement | null }
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

    const setCurrentAchievement = useCallback((currentAchievement: Achievement | null) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_CURRENT_ACHIEVEMENT,
            payload: currentAchievement
        })
    }, [])
    return { state, setAchievements, setCurrentAchievement }
}

type UseAchievementContextType = ReturnType<typeof useAchievementContext>

export const AchievementContext = createContext<UseAchievementContextType | null>(null)

type AchievementProviderType = {
    achievements: Achievement[],
    triggers: AchievementTrigger[],
    children?: ReactElement | ReactElement[] | undefined
}

export const AchievementProvider = ({
    achievements,
    triggers,
    children
}: AchievementProviderType): ReactElement => {
    return (
        <AchievementContext.Provider value={useAchievementContext({ achievements, currentAchievement: null, triggers })}>
            {children}
        </AchievementContext.Provider>
    )
}

type UseAchievementsHookType = {
    achievements: Achievement[];
    setAchievements: (achievements: Achievement[] | ((prev: Achievement[]) => Achievement[])) => void;
    currentAchievement: Achievement | null;
    setCurrentAchievement: (currentAchievement: Achievement | null) => void;
    triggers: AchievementTrigger[];
}

export const useAchievements = (): UseAchievementsHookType => {
    const context = useContext(AchievementContext)
    if (!context) {
        throw new Error('useAchievements must be used within an AchievementProvider')
    }
    const { state: { achievements, triggers, currentAchievement }, setAchievements, setCurrentAchievement } = context
    return { achievements, setAchievements, currentAchievement, setCurrentAchievement, triggers }
}