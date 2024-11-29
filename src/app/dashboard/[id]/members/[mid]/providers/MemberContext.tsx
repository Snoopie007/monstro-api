'use client'
import { Member } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"
import Stripe from "stripe";

type StateType = {
    member: Member;
    paymentMethods: Stripe.PaymentMethod[];
}


const enum REDUCER_ACTION_TYPE {
    MUTATE,
    ADD_PAYMENT_METHODS
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Member | Stripe.PaymentMethod,
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.MUTATE:
            return { ...state, member: action.payload as Member }
        case REDUCER_ACTION_TYPE.ADD_PAYMENT_METHODS:
            return { ...state, paymentMethods: [...state.paymentMethods, action.payload as Stripe.PaymentMethod] }
        default:
            throw new Error()
    }
}

const useMemberContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const mutate = useCallback((member: Member) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.MUTATE,
            payload: member
        })
    }, [])

    const addPaymentMethods = useCallback((paymentMethods: Stripe.PaymentMethod) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.ADD_PAYMENT_METHODS,
            payload: paymentMethods
        })
    }, [])

    return { state, mutate, addPaymentMethods }
}

type UseMemberContextType = ReturnType<typeof useMemberContext>



export const MemberContext = createContext<UseMemberContextType | null>(null)

type MemberProviderType = {
    member: Member,
    paymentMethods: Stripe.PaymentMethod[]
    children?: ReactElement | ReactElement[] | undefined
}

export const MemberProvider = ({
    member,
    paymentMethods,
    children
}: MemberProviderType): ReactElement => {
    return (
        <MemberContext.Provider value={useMemberContext({ member, paymentMethods })}>
            {children}
        </MemberContext.Provider>
    )
}

type UseMemberHookType = {
    member: Member,
    mutate: (member: Member) => void
}

export const useMember = (): UseMemberHookType => {
    const context = useContext(MemberContext)
    if (!context) {
        throw new Error('useMember must be used within a MemberProvider')
    }
    const { state: { member }, mutate } = context
    return { member, mutate }
}


type UseMemberPaymenHookType = {
    paymentMethods: Stripe.PaymentMethod[],
    addPaymentMethods: (paymentMethods: Stripe.PaymentMethod) => void
}

export const useMemberPaymentMethods = (): UseMemberPaymenHookType => {
    const context = useContext(MemberContext)
    if (!context) {
        throw new Error('useMemberPaymentMethods must be used within a MemberProvider')
    }
    const { state: { paymentMethods }, addPaymentMethods } = context
    return { paymentMethods, addPaymentMethods }
}