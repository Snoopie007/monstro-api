'use client'
import { Program } from "@/types";
import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"

type StateType = {
    filters: Record<string, string>,
    programs: Program[]
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

const useProductContext = (initState: StateType) => {
    const [state, dispatch] = useReducer(reducer, initState)

    const updateFilters = useCallback((filters: Record<string, string>) => {
        dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_FILTERS,
            payload: filters
        })
    }, [])

    return { state, updateFilters }
}

type UseProductContextType = ReturnType<typeof useProductContext>

export const ProductContext = createContext<UseProductContextType | null>(null)

type ProductProviderType = {
    programs: Program[],
    initialFilters?: Record<string, string>,
    children?: ReactElement | ReactElement[] | undefined
}

export const ProductProvider = ({
    programs,
    initialFilters = {},
    children
}: ProductProviderType): ReactElement => {
    return (
        <ProductContext.Provider value={useProductContext({ programs, filters: initialFilters })} >
            {children}
        </ProductContext.Provider>
    )
}

type UseProductFiltersHookType = {
    filters: Record<string, string>,
    updateFilters: (filters: Record<string, string>) => void
}

export const useProductFilters = (): UseProductFiltersHookType => {
    const context = useContext(ProductContext)
    if (!context) {
        throw new Error('useProductFilters must be used within a ProductProvider')
    }
    const { state: { filters }, updateFilters } = context
    return { filters, updateFilters }
}

type UseProductProgramsHookType = {
    programs: Program[]
}

export const useProductPrograms = (): UseProductProgramsHookType => {
    const context = useContext(ProductContext)
    if (!context) {
        throw new Error('useProductPrograms must be used within a ProductProvider')
    }
    const { state: { programs } } = context
    return { programs }
}