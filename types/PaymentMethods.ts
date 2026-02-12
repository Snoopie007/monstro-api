import { memberPaymentMethods, paymentMethods } from "@subtrees/schemas/PaymentMethods"
import { PaymentType } from "./DatabaseEnums"
import { Member } from "./member"
import { Location } from "./location"

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