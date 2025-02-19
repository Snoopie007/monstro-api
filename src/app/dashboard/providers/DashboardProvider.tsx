'use client'

import { createContext, useContext, ReactElement, ReactNode } from "react";

type StateType = {
}

interface DashboardProviderProps {
    children: ReactNode;
}

export const DashboardContext = createContext<StateType | null>(null)

export const DashboardProvider = ({ children }: DashboardProviderProps): ReactElement => {
    return (
        <DashboardContext.Provider value={{}}>
            {children}
        </DashboardContext.Provider>
    );
}

type UseDashboardHookType = {
}

export const useDashboard = (): UseDashboardHookType => {
    const context = useContext(DashboardContext)
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider')
    }

    return {};
}