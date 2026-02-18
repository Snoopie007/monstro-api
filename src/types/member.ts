import {
    members,
  } from '@subtrees/schemas'
  import type { Program } from '@subtrees/types/program'
  import { ColumnFiltersState } from '@/libs/table-utils'
import { Member, MemberCustomField, MemberField, MemberPackage, MemberSubscription } from '@subtrees/types/member'
  
  export type ExtendedMemberSubscription = MemberSubscription & {
    planId?: string
    programs?: Program[]
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
  
  export type CustomFieldType =
      | 'text'
      | 'number'
      | 'date'
      | 'boolean'
      | 'select'
      | 'multi-select'
  
  
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
  
  export type MemberStatus = 
      | 'active' | 'incomplete' | 'past_due' | 'canceled' 
      | 'paused' | 'trialing' | 'unpaid' | 'incomplete_expired' | 'archived'
  
  export interface TableState {
      page: number
      pageSize: number
      columnFilters: ColumnFiltersState
      searchQuery: string
      selectedTags: string[]
      tagOperator: 'AND' | 'OR'
      sorting: { id: string; direction: 'asc' | 'desc' }[]
  }
  
  export interface TabConfig {
      id: string
      name: string
      statusFilter: MemberStatus[]
      removable: boolean
      state: TableState
  }
  
  export interface SavedTabConfig {
      id: string
      name: string
      statusFilter: MemberStatus[]
      columnFilters: ColumnFiltersState
      searchQuery: string
      selectedTags: string[]
      tagOperator: 'AND' | 'OR'
      sorting: { id: string; direction: 'asc' | 'desc' }[]
  }
  
  export interface MembersTabState extends TabConfig {
      filteredData: {
          members: MemberListItem[]
          count: number
          customFields: CustomFieldDefinition[]
      }
  }
  
  export interface TabParams {
      id: string
      page: number
      pageSize: number
      searchQuery: string
      selectedTags: string[]
      columnFilters: ColumnFiltersState
      tagOperator: 'AND' | 'OR'
      sorting: { id: string; direction: 'asc' | 'desc' }[]
  }
  