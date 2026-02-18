"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { TaxRate } from "@subtrees/types/tax";

interface TaxRateContextType {
    taxRates: TaxRate[];
    setTaxRates: React.Dispatch<React.SetStateAction<TaxRate[]>>;
}

const TaxRateContext = createContext<TaxRateContextType | undefined>(undefined);

export function TaxRateProvider({
    children,
    initialTaxRates
}: {
    children: ReactNode;
    initialTaxRates: TaxRate[];
}) {
    const [taxRates, setTaxRates] = useState<TaxRate[]>(initialTaxRates);

    return (
        <TaxRateContext.Provider value={{ taxRates, setTaxRates }}>
            {children}
        </TaxRateContext.Provider>
    );
}

export function useTaxRates() {
    const context = useContext(TaxRateContext);
    if (context === undefined) {
        throw new Error("useTaxRates must be used within a TaxRateProvider");
    }
    return context;
}

