import { memberPaymentMethods, paymentMethods } from "../schemas/PaymentMethods"
import type { PaymentType } from "./DatabaseEnums"
import type { Location } from "./location"
import type { Member } from "./member"

export type PaymentMethod = typeof paymentMethods.$inferSelect & {
    type: PaymentType
    card: CardPaymentMethod | null
    usBankAccount: UsBankAccountPaymentMethod | null
    isDefault?: boolean
}


export type MemberPaymentMethod = typeof memberPaymentMethods.$inferSelect & {
    method?: PaymentMethod
    member?: Member
    location?: Location
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