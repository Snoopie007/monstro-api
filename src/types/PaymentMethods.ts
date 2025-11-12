
import { memberPaymentMethods } from "@/db/schemas/MemberPaymentMethods"
import { MemberLocation } from "./member"
import { PaymentType } from "./DatabaseEnums"

export type MemberPaymentMethod = typeof memberPaymentMethods.$inferSelect & {
    memberLocation?: MemberLocation
    type: PaymentType
    card: CardPaymentMethod | null
    usBankAccount: UsBankAccountPaymentMethod | null
}

export type CardPaymentMethod = {
    brand: string
    last4: string
    expMonth: number
    expYear: number
}

export type UsBankAccountPaymentMethod = {
    bankName: string
    last4: string
    accountType: string
    accountNumber: string
}