'use client'
import { Reward } from "@subtrees/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    rewards: Reward[];
}

const enum REDUCER_ACTION_TYPE {
    SET_REWARDS,
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE;
    payload: Reward[] | ((prev: Reward[]) => Reward[]);
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_REWARDS:
            const newRewards = typeof action.payload === 'function'
                ? (action.payload as ((prev: Reward[]) => Reward[]))(state.rewards)
                : action.payload as Reward[]
            return { ...state, rewards: newRewards }
        default:
            throw new Error()
    }
}

const useRewardContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const setRewards = useCallback((rewards: Reward[] | ((prev: Reward[]) => Reward[])) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_REWARDS,
            payload: rewards
        })
    }, [])

    return { state, setRewards }
}

type UseRewardContextType = ReturnType<typeof useRewardContext>

export const RewardContext = createContext<UseRewardContextType | null>(null)

type RewardProviderType = {
    rewards: Reward[],
    children?: ReactElement | ReactElement[] | undefined
}

export const RewardProvider = ({
    rewards,
    children
}: RewardProviderType): ReactElement => {
    return (
        <RewardContext.Provider value={useRewardContext({ rewards })}>
            {children}
        </RewardContext.Provider>
    )
}

type UseRewardsHookType = {
    rewards: Reward[];
    setRewards: (rewards: Reward[] | ((prev: Reward[]) => Reward[])) => void;
}

export const useRewards = (): UseRewardsHookType => {
    const context = useContext(RewardContext)
    if (!context) {
        throw new Error('useRewards must be used within a RewardProvider')
    }
    const { state: { rewards }, setRewards } = context

    return {
        rewards,
        setRewards,
    }
}

