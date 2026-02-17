import {
    memberCustomFields,
    memberFields,
    memberPackages,
    memberPlanPricing,
    memberPlans,
    memberReferrals,
    members,
    memberSubscriptions,
} from '../schemas'
import { memberInvoices } from '../schemas/invoice'
import { memberLocations } from '../schemas/MemberLocation'
import type { MemberPointsHistory } from './achievement'
import type { Contract, MemberContract } from './contract'
import type { PaymentType } from './DatabaseEnums'
import type { FamilyMember } from './FamilyMember'
import type { Location } from './location'
import type { MigrateMember } from './MigrateMember'
import type { MemberPaymentMethod, PaymentMethod } from './PaymentMethods'
import type { PlanProgram } from './program'
import type { User } from './user'
import type { Invoice } from './invoices'

export type Member = typeof members.$inferSelect & {
    user?: User
    familyMembers?: FamilyMember[]
    relatedByFamily?: FamilyMember[]
    memberLocations?: MemberLocation[]
    subscriptions?: MemberSubscription[]
    packages?: MemberPackage[]
    referrals?: MemberReferral[]
    reedemPoints?: number
    referredBy?: MemberReferral
  }


export type MemberPlanPricing = typeof memberPlanPricing.$inferSelect & {
    plan?: MemberPlan
}

export type MemberLocationProfile = {
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar: string
}

export type MemberSubscription = typeof memberSubscriptions.$inferSelect & {
    child?: MemberSubscription
    invoices?: Invoice[]
    plan?: MemberPlan
    pricing?: MemberPlanPricing
    contract?: MemberContract
    member?: Member
    paymentType: PaymentType
    location?: Location
}

export type MemberPackage = typeof memberPackages.$inferSelect & {
    plan?: MemberPlan
    pricing?: MemberPlanPricing
    contract?: MemberContract
    member?: Member
    parent?: MemberPackage
    paymentType: PaymentType,
    location?: Location
}

export type BillingCycleAnchorConfig = {
    day_of_month: number
    hour?: number
    minute?: number
    month?: number
    second?: number
}

export type MemberPlan = typeof memberPlans.$inferSelect & {
    contract?: Contract | undefined
    billingAnchorConfig: BillingCycleAnchorConfig | null
    planPrograms?: PlanProgram[]
    pricings?: MemberPlanPricing[]
    pricingOptions?: MemberPlanPricing[]
    stripeProductId?: string | null
    member?: Member
}

export type MemberInvoice = typeof memberInvoices.$inferSelect & {
    member?: Member
    location?: Location
    memberPackage?: MemberPackage | null
    memberSubscription?: MemberSubscription | null
}

export type MemberLocation = typeof memberLocations.$inferSelect & {
    location?: Location
    member?: Member,
    knownFamilyMembers?: FamilyMember[],
    lastCheckInTime?: Date | null
    totalPointsEarned?: number
    memberPaymentMethods?: MemberPaymentMethod[]
    paymentMethods?: PaymentMethod[]
    migration?: MigrateMember;
    pointsHistory?: MemberPointsHistory[];
}

export type MemberReferral = typeof memberReferrals.$inferSelect & {
    member?: Member
    referred?: Member
    location?: Location
}

export type MemberField = typeof memberFields.$inferSelect & {
    location?: Location
    customFields?: MemberCustomField[]
}

export type MemberCustomField = typeof memberCustomFields.$inferSelect & {
    member?: Member
    field?: MemberField
}
