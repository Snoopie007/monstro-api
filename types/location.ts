import type {
  MemberInvoice,
  MemberSubscription,
  PaymentType,
  Program,
  TaxRate,
  Transaction,
  Wallet,
} from ".";
import { locations, locationState } from "../schemas/locations";
import type { MemberPlan } from "./member";
import type { Vendor } from "./vendor";

export type Location = typeof locations.$inferSelect & {
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  transactions?: Transaction[];
  wallet?: Wallet;
  memberPlans?: MemberPlan[];
  taxRates?: TaxRate[];
  taxRate?: TaxRate;
  vendor?: Vendor;
};


export type LocationState = typeof locationState.$inferSelect & {
  settings: LocationSettings;
}


export type HolidayBehavior = 'block_all' | 'block_new_only' | 'notify_only';

export type HolidaySettings = {
  blockedHolidays: number[];
  defaultBehavior: HolidayBehavior;
  advanceBlockDays: number;
  autoNotifyMembers: boolean;
};

export type OnboardingCompetitor =
  | 'spark'
  | 'gymdesk'
  | 'pushpress'
  | 'mybody'
  | 'other';

export type OnboardingChecklist = {
  importMembers: boolean;
  contracts: boolean;
  firstProgram: boolean;
  firstProductWithPricing: boolean;
  // TODO: points?: number;
  // TODO: badges?: string[];
  // TODO: achievements?: string[];
};

export type LocationOnboardingSettings = {
  version: 1;
  initialCompleted: boolean;
  initialCompletedAt?: string;
  usage?: {
    primaryUse?: string;
    businessType?: string;
    competitors?: OnboardingCompetitor[];
    otherCompetitor?: string;
    migrationIntent?: string;
  };
  website?: {
    decision?: 'provided' | 'no_website';
    url?: string;
    // TODO: website AI analysis scaffolding
    // discoveryStatus?: 'idle' | 'queued' | 'processing' | 'complete' | 'failed';
    // discoveryPayload?: unknown;
  };
  businessReview?: {
    completed?: boolean;
    completedAt?: string;
  };
  timezone?: {
    value?: string;
    completedAt?: string;
  };
  tax?: {
    configured?: boolean;
    defaultTaxRateId?: string;
    noTaxAcknowledged?: boolean;
    completedAt?: string;
  };
  welcomeMessage?: {
    confirmed?: boolean;
    completedAt?: string;
  };
  stripe?: {
    decision?: 'connected' | 'skipped';
    skipAcknowledged?: boolean;
    completedAt?: string;
  };
  welcomeVideo?: {
    dismissedAt?: string;
  };
  checklist?: Partial<OnboardingChecklist>;
};




export type LocationSettings = {
  theme: 'default';
  passOnFees: boolean;
  processingMethods: PaymentType[];
  holidays?: HolidaySettings;
  onboarding?: LocationOnboardingSettings;
}
