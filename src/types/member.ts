import type { Contract, MemberContract } from './contract'
import type { FamilyMember } from './FamilyMember'
import type { Location } from './location'
import type { PlanProgram } from './program'
import {
  importMembers,
  memberInvoices,
  memberLocations,
  memberPackages,
  memberPlans,
  memberPlanPricing,
  memberReferrals,
  members,
  memberSubscriptions,
  memberFields,
  memberCustomFields,
} from '@/db/schemas'
import type { PaymentType } from './DatabaseEnums'
import type { MemberPaymentMethod, PaymentMethod } from './PaymentMethods'


export type Member = typeof members.$inferSelect & {
  familyMembers?: FamilyMember[]
  relatedByFamily?: FamilyMember[]
  memberLocation?: MemberLocation
  subscriptions?: MemberSubscription[]
  packages?: MemberPackage[]
  referrals?: MemberReferral[]
  reedemPoints?: number
  referredBy?: MemberReferral
}

export type MemberPlanPricing = typeof memberPlanPricing.$inferSelect & {
  plan?: MemberPlan
}

export type MemberSubscription = typeof memberSubscriptions.$inferSelect & {
  child?: MemberSubscription | null
  invoices?: MemberInvoice[]
  plan?: MemberPlan
  pricing?: MemberPlanPricing | null
  contract?: MemberContract | null
  member?: Member
  paymentType: PaymentType
}

export type MemberPackage = typeof memberPackages.$inferSelect & {
  plan?: MemberPlan
  pricing?: MemberPlanPricing | null
  contract?: MemberContract | null
  member?: Member
  parent?: MemberPackage | null
  paymentType: PaymentType
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
  pricingOptions?: MemberPlanPricing[]
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
}



export type MemberLocationProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar: string
}

export type FamilyPlan = {
  planName: string
  planId: number
  subscriptionId?: number
  packageId?: number
}

export type ImportMember = typeof importMembers.$inferSelect & {}

export type MemberReferral = typeof memberReferrals.$inferSelect & {
  member?: Member
  referred?: Member
  location?: Location
}

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi-select'

export type MemberField = typeof memberFields.$inferSelect & {
  location?: Location
  customFields?: MemberCustomField[]
}

export type MemberCustomField = typeof memberCustomFields.$inferSelect & {
  member?: Member
  field?: MemberField
}

export type MemberWithCustomFields = Member & {
  customFields?: MemberCustomField[]
}

export type CustomFieldOption = {
  value: string
  label: string
}

export type CustomFieldDefinition = MemberField & {
  options?: CustomFieldOption[]
  required?: boolean
  placeholder?: string
  helpText?: string
}

export type MemberSortableField =
  | 'created'
  | 'updated'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'dob'

export const MEMBER_SORTABLE_FIELDS: MemberSortableField[] = [
  'created',
  'updated',
  'firstName',
  'lastName',
  'email',
  'dob',
]

// Determine sort order - type-safe mapping of sortable fields
export const sortColumnMap: Record<MemberSortableField, any> = {
  created: members.created,
  updated: members.updated,
  firstName: members.firstName,
  lastName: members.lastName,
  email: members.email,
  dob: members.dob,
}

export type LocationMembersQuery = {
  size: string
  page: string
  query: string
  tags: string
  tagOperator: string
  sortBy: string
  sortOrder: string
  columnFilters: string
}

export type MemberTagRef = {
  id: string
  name: string
}

export type MemberCustomFieldValue = {
  fieldId: string
  value: string
}

export type MemberListItem = {
  id: string
  userId: string
  firstName: string
  lastName: string | null
  email: string
  phone: string
  avatar: string | null
  created: Date
  updated: Date | null
  dob: Date | null
  gender: string | null
  firstTime: boolean
  referralCode: string
  stripeCustomerId: string | null
  memberLocation: { status: string }
  tags: MemberTagRef[]
  customFields: MemberCustomFieldValue[]
}

export type LocationMembersResponse = {
  count: number
  members: MemberListItem[]
  customFields: CustomFieldDefinition[]
}
