'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { TaxRate } from '@/types'

interface TaxRateContextType {
  taxRates: TaxRate[]
  setTaxRates: React.Dispatch<React.SetStateAction<TaxRate[]>>
}

const TaxRateContext = createContext<TaxRateContextType | undefined>(undefined)

interface TaxRateProviderProps {
  children: ReactNode
  initialTaxRates: TaxRate[]
}

export function TaxRateProvider({ children, initialTaxRates }: TaxRateProviderProps) {
  const [taxRates, setTaxRates] = useState<TaxRate[]>(initialTaxRates)

  return (
    <TaxRateContext.Provider
      value={{
        taxRates,
        setTaxRates,
      }}
    >
      {children}
    </TaxRateContext.Provider>
  )
}

export function useTaxRate() {
  const context = useContext(TaxRateContext)
  if (context === undefined) {
    throw new Error('useTaxRate must be used within a TaxRateProvider')
  }
  return context
}

