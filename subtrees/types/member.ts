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
import { memberLocations } from '../schemas/MemberLocation'
import type { MemberPointsHistory } from './achievement'
import type { Contract, MemberContract } from './contract'
import type { PaymentType } from './DatabaseEnums'
import type { FamilyMember } from './FamilyMember'
import type { MemberInvoice } from './invoices'
import type { Location } from './location'
import type { MigrateMember } from './MigrateMember'
import type { MemberPaymentMethod, PaymentMethod } from './PaymentMethods'
import type { PlanProgram, Program } from './program'
import type { User } from './user'

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

export type MemberAddress = {
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}


export type MemberPlanPricing = typeof memberPlanPricing.$inferSelect & {
  plan?: MemberPlan
}

export type MemberSubscription = typeof memberSubscriptions.$inferSelect & {
  child?: MemberSubscription
  invoices?: MemberInvoice[]
  plan?: MemberPlan
  pricing?: MemberPlanPricing
  contract?: MemberContract
  member?: Member
  paymentType: PaymentType
  location?: Location
}

export type ExtendedMemberSubscription = MemberSubscription & {
  planId?: string
  programs?: Program[]
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

export type ExtendedMemberPackage = MemberPackage & {
  planId?: string
  programs?: Program[]
}
export type BillingCycleAnchorConfig = {
  day_of_month: number
  hour?: number
  minute?: number
  month?: number
  second?: number
}

export type MemberPlan = typeof memberPlans.$inferSelect & {
  contract?: Contract | null
  billingAnchorConfig: BillingCycleAnchorConfig | null
  planPrograms?: PlanProgram[]
  pricings?: MemberPlanPricing[]
  member?: Member
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



export type MemberReferral = typeof memberReferrals.$inferSelect & {
  member?: Member
  referredMember?: Member
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