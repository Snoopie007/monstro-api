import {
  MemberPlan,
  MemberPackage,
  MemberInvoice,
  Transaction,
  MemberSubscription,
} from "@/types";
import { isAfter, addDays, addWeeks, addMonths, addYears } from "date-fns";
import {db} from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { eq, and, lt } from "drizzle-orm";
import { serversideApiClient } from "@/libs/api/server";
 
type BaseData = {
  memberPlanId: string;
  locationId: string;
  memberId: string;
  programId: string;
  startDate: Date | string;
  paymentMethod:
  | "card"
  | "cash"
  | "check"
  | "zelle"
  | "venmo"
  | "paypal"
  | "apple"
  | "google";
};

type PackageData = BaseData & {
  expireDate?: Date;
  totalClassLimit?: number;
};

type SubscriptionData = BaseData & {
  startDate: string;
  endDate?: string;
  trialDays?: number;
};

// Create insert types that omit auto-generated fields
type TransactionInsert = Omit<
  Transaction,
  | "id"
  | "created"
  | "updated"
  | "member"
  | "subscription"
  | "package"
  | "metadata"
  | "invoice"
> & {
  metadata?: Record<string, any>;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  packageId?: string | null;
  refunded?: boolean;
};

type MemberInvoiceInsert = Omit<
  MemberInvoice,
  | "id"
  | "created"
  | "updated"
  | "member"
  | "location"
  | "memberPackage"
  | "memberSubscription"
> & {
  metadata?: Record<string, any>;
  memberPackageId?: string | null;
  memberSubscriptionId?: string | null;
  dueDate?: Date;
  attemptCount?: number;
  invoicePdf?: string | null;
  forPeriodStart?: Date | null;
  forPeriodEnd?: Date | null;
};

type MemberPackageInsert = Omit<
  MemberPackage,
  | "id"
  | "updated"
  | "invoice"
  | "plan"
  | "contract"
  | "member"
  | "parent"
  | "transactions"
> & {
  metadata?: Record<string, unknown>;
  memberContractId?: string | null;
  stripePaymentId?: string | null;
  parentId?: string | null;
  totalClassAttended?: number;
};

type MemberSubscriptionInsert = Omit<
  MemberSubscription,
  | "id"
  | "created"
  | "updated"
  | "child"
  | "invoices"
  | "plan"
  | "contract"
  | "member"
> & {
  cancelAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date | null;
  endedAt?: Date | null;
  metadata?: Record<string, unknown>;
};

type BaseReturnType = {
  newTransaction: TransactionInsert;
  newInvoice: MemberInvoiceInsert;
};

type CreatePackageReturn = BaseReturnType & {
  newPkg: MemberPackageInsert;
};

type CreateSubscriptionReturn = BaseReturnType & {
  newSubscription: MemberSubscriptionInsert;
};

function calculateCurrentPeriodEnd(
  startDate: Date,
  interval: string,
  threshold: number
): Date {
  const endDate = new Date(startDate); // Initialize endDate with startDate

  switch (interval) {
    case "day":
      endDate.setDate(endDate.getDate() + threshold);
      break;
    case "week":
      endDate.setDate(endDate.getDate() + threshold * 7);
      break;
    case "month":
      endDate.setMonth(endDate.getMonth() + threshold);
      break;
    case "year":
      endDate.setFullYear(endDate.getFullYear() + threshold);
      break;
    default:
      throw new Error("Invalid plan interval");
  }
  return endDate;
}

function calculateInvoice(plans: MemberPlan[], tax: number, discount: number) {
  const items: { name: string; quantity: number; price: number }[] = [];
  let subtotal = 0;

  plans.forEach((plan) => {
    items.push({
      name: plan.name,
      quantity: 1,
      price: plan.price,
    });
    subtotal += plan.price;
  });
  const total = subtotal - discount + tax;
  return {
    items,
    tax,
    total,
    discount,
    subtotal,
  };
}

type RestProps = {
  memberId: string;
  locationId: string;
  paymentMethod: string;
};

function createTransaction(
  plan: MemberPlan,
  props: RestProps,
  tax: number
): TransactionInsert {
  const today = new Date();
  const description =
    plan.type === "recurring"
      ? `Subscription to ${plan.name}`
      : `One time payment for ${plan.name}`;

  return {
    ...props,
    chargeDate: today,
    status: "incomplete",
    type: "inbound",
    description,
    taxAmount: tax,
    amount: plan.price,
    currency: plan.currency,
    // TODO: ammend type later on
    items: [{ name: plan.name }],
    metadata: {},
    refunded: false,
    invoiceId: null,
    subscriptionId: null,
    packageId: null,
  };
}

function createInvoice(
  plan: MemberPlan,
  props: RestProps,
  tax: number
): MemberInvoiceInsert {
  const description =
    plan.type === "recurring"
      ? `Subscription to ${plan.name}`
      : `Payment for ${plan.name}`;
  return {
    ...calculateInvoice([plan], tax, 0),
    memberId: props.memberId,
    locationId: props.locationId,
    paymentMethod: props.paymentMethod,
    invoiceType: plan.type === "recurring" ? "recurring" : "one-off",
    sentAt: null,
    description,
    currency: plan.currency,
    paid: false,
    status: "draft",
    metadata: {},
    memberPackageId: null,
    memberSubscriptionId: null,
    dueDate: new Date(),
    attemptCount: 0,
    invoicePdf: null,
    forPeriodStart: null,
    forPeriodEnd: null,
  };
}

function createPackage(
  data: PackageData,
  plan: MemberPlan,
  tax: number
): CreatePackageReturn {
  const today = new Date();
  const startDate = data.startDate ? new Date(data.startDate) : today;
  const { totalClassLimit, ...rest } = data;
  const { expireInterval, expireThreshold } = plan;

  let expireDate: Date | null = null;
  if (data.expireDate) {
    expireDate = new Date(data.expireDate);
  } else if (expireInterval && expireThreshold) {
    expireDate = calculateCurrentPeriodEnd(
      startDate,
      expireInterval,
      expireThreshold
    );
  }

  const newPkg: MemberPackageInsert = {
    ...rest,
    locationId: rest.locationId,
    startDate: startDate,
    expireDate,
    totalClassLimit: totalClassLimit || 0,
    created: today,
    status: "incomplete",
    metadata: {},
    memberContractId: null,
    stripePaymentId: null,
    parentId: null,
    totalClassAttended: 0,
  };

  const newTransaction = createTransaction(plan, rest, tax);
  const newInvoice = createInvoice(plan, rest, tax);
  return { newTransaction, newPkg, newInvoice };
}

function createSubscription(
  data: SubscriptionData,
  plan: MemberPlan,
  tax: number
): CreateSubscriptionReturn {
  const today = new Date();
  const startDate = data.startDate ? new Date(data.startDate) : today;
  const periodEnd = calculateCurrentPeriodEnd(
    startDate,
    plan.interval!,
    plan.intervalThreshold!
  );

  const { trialDays, endDate, ...rest } = data;

  let trialEnd: Date | null = null;
  if (data.trialDays) {
    if (isAfter(startDate, today)) {
      trialEnd = new Date(
        Math.max(startDate.getTime(), startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)
      );
    } else {
      trialEnd = new Date(
        Math.max(today.getTime(), today.getTime() + data.trialDays * 24 * 60 * 60 * 1000)
      );
    }
  }

  const cancelAt = data.endDate ? new Date(data.endDate) : null;
  const newSubscription: MemberSubscriptionInsert = {
    ...rest,
    memberId: rest.memberId,
    startDate: startDate,
    currentPeriodStart: startDate,
    currentPeriodEnd: periodEnd,
    cancelAt: cancelAt,
    status: "incomplete",
    trialEnd,
    cancelAtPeriodEnd: false,
    endedAt: cancelAt || null,
    metadata: {},
    parentId: null,
    stripeSubscriptionId: null,
    memberContractId: null,
  };

  const newTransaction = createTransaction(plan, rest, tax);
  const newInvoice = {
    ...createInvoice(plan, rest, tax),
    forPeriodStart: startDate,
    forPeriodEnd: periodEnd,
  };

  return { newSubscription, newTransaction, newInvoice };
}
// Updates subscriptions to past_due if their billing period has ended
export async function updatePastDueSubscriptions(
  locationId: string,
  memberId: string
) {
  const now = new Date();

  // Find all active subscriptions where currentPeriodEnd is in the past
  const pastDueSubscriptions = await db.query.memberSubscriptions.findMany({
    where: and(
      eq(memberSubscriptions.locationId, locationId),
      eq(memberSubscriptions.memberId, memberId),
      eq(memberSubscriptions.status, "active"),
      lt(memberSubscriptions.currentPeriodEnd, now)
    ),
  });

  // Update them to past_due
  if (pastDueSubscriptions.length > 0) {
    await db
      .update(memberSubscriptions)
      .set({
        status: "past_due",
        updated: new Date(),
      })
      .where(
        and(
          eq(memberSubscriptions.locationId, locationId),
          eq(memberSubscriptions.memberId, memberId),
          eq(memberSubscriptions.status, "active"),
          lt(memberSubscriptions.currentPeriodEnd, now)
        )
      );
  }

  return pastDueSubscriptions.length;
}

/**
 * Schedule recurring invoice email reminders for a subscription
 * Calculates all future due dates and schedules emails via BullMQ
 */
async function scheduleRecurringInvoiceEmails(params: {
  subscriptionId: string;
  memberId: string;
  locationId: string;
  memberEmail: string;
  memberFirstName: string;
  memberLastName: string;
  locationName: string;
  locationAddress: string;
  startDate: Date;
  endDate?: Date;
  interval: string;
  intervalThreshold: number;
  invoiceDetails: {
    description: string;
    items: any[];
    total: number;
    currency: string;
  };
}) {
  const apiClient = serversideApiClient();
  
  // Calculate all future due dates
  const dueDates: Date[] = [];
  let currentDate = new Date(params.startDate);
  const maxDate = params.endDate || addYears(currentDate, 2); // Default 2 years if no end date
  
  while (currentDate <= maxDate) {
    dueDates.push(new Date(currentDate));
    
    // Calculate next due date based on interval
    switch (params.interval) {
      case 'day':
        currentDate = addDays(currentDate, params.intervalThreshold);
        break;
      case 'week':
        currentDate = addWeeks(currentDate, params.intervalThreshold);
        break;
      case 'month':
        currentDate = addMonths(currentDate, params.intervalThreshold);
        break;
      case 'year':
        currentDate = addYears(currentDate, params.intervalThreshold);
        break;
      default:
        throw new Error(`Invalid interval: ${params.interval}`);
    }
    
    // Safety limit: max 100 invoices scheduled at once
    if (dueDates.length >= 100) break;
  }
  
  // Schedule email for each due date via monstro-api
  const scheduledCount = 0;
  for (const dueDate of dueDates) {
    try {
      await apiClient.post('/protected/locations/email', {
        recipient: params.memberEmail,
        subject: `Invoice Reminder: ${params.invoiceDetails.description}`,
        template: 'InvoiceReminderEmail',
        data: {
          member: {
            firstName: params.memberFirstName,
            lastName: params.memberLastName,
            email: params.memberEmail,
          },
          invoice: {
            id: `${params.subscriptionId}-${dueDate.getTime()}`,
            total: params.invoiceDetails.total,
            dueDate: dueDate.toISOString(),
            description: params.invoiceDetails.description,
            items: params.invoiceDetails.items || [],
          },
          location: {
            name: params.locationName || '',
            address: params.locationAddress || '',
          },
          monstro: {
            fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
            privacyUrl: 'https://mymonstro.com/privacy',
            unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
          },
        },
        sendAt: dueDate.toISOString(),
        jobId: `invoice-reminder-${params.subscriptionId}-${dueDate.getTime()}`,
      });
    } catch (error) {
      console.error(`Failed to schedule email for ${dueDate.toISOString()}:`, error);
      // Continue scheduling other emails even if one fails
    }
  }
  
  return scheduledCount;
}

export {
  calculateCurrentPeriodEnd,
  calculateInvoice,
  createPackage,
  createSubscription,
  createInvoice,
  createTransaction,
  scheduleRecurringInvoiceEmails,
};
