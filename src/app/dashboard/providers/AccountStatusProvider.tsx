'use client'
import { createContext, useContext, ReactElement, ReactNode } from "react";

type StateType = {
}

interface AccountStatusProviderProps {
    children: ReactNode;
}

export const AccountStatusContext = createContext<StateType | null>(null)

export const AccountStatusProvider = ({ children }: AccountStatusProviderProps): ReactElement => {

    return (
        <AccountStatusContext.Provider value={{}}>
            {children}
        </AccountStatusContext.Provider>
    );
}

type UseAccountStatusHookType = {
}

export const useAccountStatus = (): UseAccountStatusHookType => {
    const context = useContext(AccountStatusContext)
    if (!context) {
        throw new Error('useAccountStatus must be used within a AccountStatusProvider')
    }

    return {};
}