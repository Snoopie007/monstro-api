
import type { PaymentType } from "./DatabaseEnums"
import type { Address } from "./other"

export type PaymentMethod = {
    id: string
    source: 'stripe' | 'square' | 'authorize-net'
    type: PaymentType
    address?: Address
    card?: CardPaymentMethod
    usBankAccount?: UsBankAccountPaymentMethod
    isDefault: boolean
}



export type CardPaymentMethod = {
    brand: string
    last4: string | null
    expMonth: number | null
    expYear: number | null
}

export type UsBankAccountPaymentMethod = {
    bankName: string | null
    last4: string | null
    accountType: string | null
}