
import type { PaymentType } from "./DatabaseEnums"
import Stripe from "stripe";
export type PaymentMethod = {
    id: string
    source: 'stripe' | 'square'
    type: PaymentType
    address?: Stripe.Address
    card: CardPaymentMethod | null
    usBankAccount: UsBankAccountPaymentMethod | null
    isDefault: boolean

}


export type CardPaymentMethod = {
    brand: string
    last4: string | null
    expMonth: number
    expYear: number
}

export type UsBankAccountPaymentMethod = {
    bankName: string | null
    last4: string | null
    accountType: string | null
}