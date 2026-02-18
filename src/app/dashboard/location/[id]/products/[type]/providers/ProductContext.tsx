'use client'
import { Group, Program } from "@subtrees/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    filters: Record<string, string>,
    programs: Program[],
    groups: Group[]
}

const enum REDUCER_ACTION_TYPE {
    UPDATE_FILTERS,
}

type ReducerAction = {
    type: REDUCER_ACTION_TYPE,
    payload?: Record<string, string>,
}

const reducer = (state: StateType, action: ReducerAction): StateType => {
    switch (action.type) {
        case REDUCER_ACTION_TYPE.UPDATE_FILTERS:
            return { ...state, filters: action.payload as Record<string, string> }
        default:
            throw new Error()
    }
}

const useProductsContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const updateFilters = useCallback((filters: Record<string, string>) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_FILTERS,
            payload: filters
        })
    }, [])

    return { state, updateFilters }
}

type UseProductsContextType = ReturnType<typeof useProductsContext>

export const ProductsContext = createContext<UseProductsContextType | null>(null)

type ProductsProviderType = {
    programs: Program[],
    groups: Group[],
    initialFilters?: Record<string, string>,
    children?: ReactElement | ReactElement[] | undefined
}

export const ProductsProvider = ({
    programs,
    groups,
    initialFilters = {},
    children
}: ProductsProviderType): ReactElement => {
    return (
        <ProductsContext.Provider value={useProductsContext({ programs, groups, filters: initialFilters })} >
            {children}
        </ProductsContext.Provider>
    )
}

type UseProductsHookType = {
    filters: Record<string, string>,
    updateFilters: (filters: Record<string, string>) => void,
    programs: Program[],
    groups: Group[]
}

export const useProducts = (): UseProductsHookType => {
    const context = useContext(ProductsContext)
    if (!context) {
        throw new Error('useProducts must be used within a ProductsProvider')
    }
    const { state: { filters, programs, groups }, updateFilters } = context
    return { filters, updateFilters, programs, groups }
}
