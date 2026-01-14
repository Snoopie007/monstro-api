'use client'
import { Transaction } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    transactions: Transaction[];
}

const enum REDUCER_ACTION_TYPE {
    SET_TRANSACTIONS,
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE;
    payload: Transaction[] | ((prev: Transaction[]) => Transaction[]);
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.SET_TRANSACTIONS:
            const newTransactions = typeof action.payload === 'function'
                ? (action.payload as ((prev: Transaction[]) => Transaction[]))(state.transactions)
                : action.payload as Transaction[]
            return { ...state, transactions: newTransactions }
        default:
            throw new Error()
    }
}

const useTransactionContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const setTransactions = useCallback((transactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.SET_TRANSACTIONS,
            payload: transactions
        })
    }, [])

    return { state, setTransactions }
}

type UseTransactionContextType = ReturnType<typeof useTransactionContext>

export const TransactionContext = createContext<UseTransactionContextType | null>(null)

type TransactionProviderType = {
    transactions: Transaction[],
    children?: ReactElement | ReactElement[] | undefined
}

export const TransactionProvider = ({
    transactions,
    children
}: TransactionProviderType): ReactElement => {
    return (
        <TransactionContext.Provider value={useTransactionContext({ transactions })}>
            {children}
        </TransactionContext.Provider>
    )
}

type UseTransactionsHookType = {
    transactions: Transaction[];
    setTransactions: (transactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
}

export const useTransactions = (): UseTransactionsHookType => {
    const context = useContext(TransactionContext)
    if (!context) {
        throw new Error('useTransactions must be used within a TransactionProvider')
    }
    const { state: { transactions }, setTransactions } = context

    return {
        transactions,
        setTransactions,
    }
}

