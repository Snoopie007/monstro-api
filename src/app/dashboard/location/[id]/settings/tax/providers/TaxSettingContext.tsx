// 'use client'
// import { Location } from "@/types";
// import { createContext, useReducer, ReactElement, useCallback, useContext } from "react"
// import Stripe from "stripe";

// type StateType = {
//     location: Location,
//     settings: Stripe.Tax.Settings | null,
//     registrations: Stripe.Tax.Registration[]
// }

// const enum REDUCER_ACTION_TYPE {
//     UPDATE_SETTINGS,
//     UPDATE_REGISTRATIONS
// }

// type ReducerAction = {
//     type: REDUCER_ACTION_TYPE,
//     payload?: Stripe.Tax.Settings | Stripe.Tax.Registration,
// }

// const reducer = (state: StateType, action: ReducerAction): StateType => {
//     switch (action.type) {
//         case REDUCER_ACTION_TYPE.UPDATE_SETTINGS:
//             return { ...state, settings: action.payload as Stripe.Tax.Settings }
//         case REDUCER_ACTION_TYPE.UPDATE_REGISTRATIONS:
//             return {
//                 ...state,
//                 registrations: [...state.registrations, action.payload as Stripe.Tax.Registration]
//             }
//         default:
//             throw new Error()
//     }
// }

// const useTaxSettingsContext = (initState: StateType) => {
//     const [state, dispatch] = useReducer(reducer, initState)

//     const updateSettings = useCallback((settings: Stripe.Tax.Settings) => {
//         dispatch({
//             type: REDUCER_ACTION_TYPE.UPDATE_SETTINGS,
//             payload: settings
//         })
//     }, [])

//     const addRegistration = useCallback((registration: Stripe.Tax.Registration) => {
//         dispatch({
//             type: REDUCER_ACTION_TYPE.UPDATE_REGISTRATIONS,
//             payload: registration
//         })
//     }, [])

//     return { state, updateSettings, addRegistration }
// }

// type UseTaxSettingsContextType = ReturnType<typeof useTaxSettingsContext>

// export const TaxSettingsContext = createContext<UseTaxSettingsContextType | null>(null)

// type TaxSettingsProviderType = {
//     location: Location,
//     settings: Stripe.Tax.Settings | null,
//     registrations: Stripe.Tax.Registration[]
//     children?: ReactElement | ReactElement[] | undefined
// }

// export const TaxSettingsProvider = ({
//     location,
//     settings,
//     registrations,
//     children
// }: TaxSettingsProviderType): ReactElement => {
//     return (
//         <TaxSettingsContext.Provider value={useTaxSettingsContext({ location, settings, registrations })}>
//             {children}
//         </TaxSettingsContext.Provider>
//     )
// }

// type UseTaxSettingsHookType = {
//     location: Location,
//     settings: Stripe.Tax.Settings | null,
//     registrations: Stripe.Tax.Registration[],
//     updateSettings: (settings: Stripe.Tax.Settings) => void,
//     addRegistration: (registration: Stripe.Tax.Registration) => void
// }

// export const useTaxSettings = (): UseTaxSettingsHookType => {
//     const context = useContext(TaxSettingsContext)
//     if (!context) {
//         throw new Error('useTaxSettings must be used within a TaxSettingsProvider')
//     }
//     const { state: { location, settings, registrations }, updateSettings, addRegistration } = context
//     return { location, settings, registrations, updateSettings, addRegistration }
// }
