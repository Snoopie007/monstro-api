import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices, members, transactions, memberSubscriptions } from "@/db/schemas";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { MemberStripePayments } from "@/libs/server/stripe";
import { scheduleOneOffInvoiceReminders } from "../../../utils";

type CreateInvoiceProps = {
  id: string;
  mid: string;
};

export async function POST(
  req: NextRequest,
  props: { params: Promise<CreateInvoiceProps> }
) {
  const params = await props.params;

  try {
    const body = await req.json();
    const {
      description,
      items,
      dueDate,
      type,
      paymentType,
      tax,
      discount,
      selectedSubscriptionId,
    } = body;

    // Get member
    const member = await db.query.members.findFirst({
      where: eq(members.id, params.mid),
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Handle from-subscription invoice creation
    if (type === "from-subscription" && selectedSubscriptionId) {
      const subscription = await db.query.memberSubscriptions.findFirst({
        where: eq(memberSubscriptions.id, selectedSubscriptionId),
        with: { plan: true, pricing: true },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        );
      }

      if (subscription.status !== "past_due") {
        return NextResponse.json(
          { error: "Subscription must be past due to generate invoice" },
          { status: 400 }
        );
      }

      // Use pricing for price if available, fallback to 0 if no pricing
      const price = subscription.pricing?.price || 0;
      const pricingName = subscription.pricing?.name ? ` - ${subscription.pricing.name}` : "";

      // Create invoice with subscription details
      const subscriptionInvoiceData = {
        memberId: params.mid,
        locationId: params.id,
        memberSubscriptionId: subscription.id,
        description: `${subscription.plan.name}${pricingName} - Billing Period`,
        items: [{
          name: subscription.plan.name + pricingName,
          description: subscription.plan.description || "",
          quantity: 1,
          price: price, // Already in cents
        }],
        total: price,
        subtotal: price,
        tax: 0, // TODO: Implement add tax
        discount: 0,
        currency: subscription.pricing?.currency || subscription.plan.currency || "usd",
        status: "draft" as const,
        dueDate: new Date(subscription.currentPeriodEnd),
        paymentType: subscription.paymentType,
        invoiceType: "recurring" as const,
        forPeriodStart: new Date(subscription.currentPeriodStart),
        forPeriodEnd: new Date(subscription.currentPeriodEnd),
        metadata: {
          type: "from-subscription",
          subscriptionId: subscription.id,
          pricingId: subscription.pricing?.id,
        },
      };

      const invoice = await db.transaction(async (tx) => {
        // Create invoice as draft
        const [newInvoice] = await tx
          .insert(memberInvoices)
          .values(subscriptionInvoiceData)
          .returning();

        // Create incomplete transaction
        await tx.insert(transactions).values({
          memberId: params.mid,
          locationId: params.id,
          invoiceId: newInvoice.id,
          description: `${subscription.plan.name}${pricingName} - Recurring Payment`,
          type: "inbound",
          status: "incomplete",
          paymentType: subscription.paymentType,
          total: price,
          currency: subscription.pricing?.currency || subscription.plan.currency || "usd",
          created: new Date(),
          subTotal: price,
          // TODO: implement tax
          // tax: 
          items: [{
            productId: subscription.plan.id,
            amount: price,
            tax: 0,
            quantity: 1,
        }],
        });

        return newInvoice;
      });

      // Schedule reminder for subscription-generated invoices
      if (invoice.dueDate) {
        await scheduleOneOffInvoiceReminders(invoice.id, new Date(invoice.dueDate), params.id);
      }

      return NextResponse.json(invoice, { status: 201 });
    }

    // Manual payment flow - fully manual, no Stripe
    if (paymentType === "cash") {
      const localInvoiceData = {
        memberId: params.mid,
        locationId: params.id,
        description:
          description ||
          `Custom invoice for ${member.firstName} ${member.lastName}`,
        items: items,
        total: items.reduce((sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number), 0),
        subtotal: items.reduce(
          (sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number),
          0
        ),
        tax: tax || 0,
        discount: discount || 0,
        currency: "usd",
        status: "draft" as const,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        paymentType: "cash" as const,
        invoiceType: "one-off" as const,
        metadata: {
          type: type,
        },
      };


      const invoice = await db.transaction(async (tx) => {
        // Create invoice as draft
        const [newInvoice] = await tx
          .insert(memberInvoices)
          .values(localInvoiceData)
          .returning();

        // Create incomplete transaction
        await tx
          .insert(transactions)
          .values({
            memberId: params.mid,
            locationId: params.id,
            invoiceId: newInvoice.id,
            description: `Manual invoice - ${type}`,
            type: "inbound",
            status: "incomplete",
            paymentType: localInvoiceData.paymentType,
            total: localInvoiceData.total,
            currency: localInvoiceData.currency,
            created: new Date(),
          });

        return newInvoice;
      });

      // Schedule reminder for one-off cash invoices
      if (invoice.dueDate) {
        await scheduleOneOffInvoiceReminders(invoice.id, new Date(invoice.dueDate), params.id);
      }

      return NextResponse.json(invoice, { status: 201 });
    }

    // Cash payment flow - Stripe handles invoice but payment is cash
    // Stripe flow - card payment
    if (paymentType === "card" || !paymentType) {
      // Validate Stripe customer exists
      if (!member?.stripeCustomerId) {
        return NextResponse.json(
          { error: "Member does not have a Stripe customer ID" },
          { status: 400 }
        );
      }

      // Get Stripe customer instance
      const integration = await db.query.integrations.findFirst({
        where: (integrations, { eq, and }) =>
          and(
            eq(integrations.locationId, params.id),
            eq(integrations.service, "stripe")
          ),
      });
      if (!integration || !integration.accountId) {
        return NextResponse.json(
          { error: "Stripe integration not found" },
          { status: 404 }
        );
      }
      const stripe = new MemberStripePayments(integration.accountId);
      stripe.setCustomer(member.stripeCustomerId);

      let stripeInvoice: Stripe.Invoice | Stripe.SubscriptionSchedule | undefined;
      let localInvoiceData: Record<string, unknown> | undefined;

      if (type === "one-off") {
        // Create invoice items first
        const invoiceItemIds: string[] = [];
        for (const item of items) {
          const invoiceItem = await stripe.createInvoiceItem(
            member.stripeCustomerId,
            {
              amount: item.price * item.quantity,
              currency: "usd",
              description: `${item.name}${item.description ? ` - ${item.description}` : ""
                }`,
              metadata: {
                locationId: params.id,
                createdBy: "admin",
                itemName: item.name,
                quantity: item.quantity.toString(),
              },
            }
          );
          invoiceItemIds.push(invoiceItem.id);
        }

        // Create the draft invoice
        stripeInvoice = await stripe.createDraftInvoice(member.stripeCustomerId, {
          collection_method: "send_invoice",
          description: description,
          due_date: dueDate
            ? Math.floor(new Date(dueDate).getTime() / 1000)
            : Math.floor(
              new Date(Date.now() + 24 * 60 * 60 * 1000).getTime() / 1000
            ),
          pending_invoice_items_behavior: "include",
          metadata: {
            locationId: params.id,
            memberId: params.mid,
            type: "one-off-admin-created",
            invoiceItemIds: invoiceItemIds.join(","),
          },
        });

        localInvoiceData = {
          memberId: params.mid,
          locationId: params.id,
          description:
            description ||
            `Custom invoice for ${member.firstName} ${member.lastName}`,
          items: items,
          total: items.reduce((sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number), 0),
          subtotal: items.reduce(
            (sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number),
            0
          ),
          tax: tax || 0,
          discount: discount || 0,
          currency: "usd",
          status: "draft" as const,
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          paymentType: paymentType === "cash" ? ("cash" as const) : ("card" as const),
          invoiceType: "one-off" as const,
          metadata: {
            stripeInvoiceId: stripeInvoice.id,
            type: type,
            invoiceItemIds: invoiceItemIds,
          },
        };
      } else if (type === "recurring") {
        // For recurring, we need recurringSettings
        const recurringSettings = body.recurringSettings;
        if (!recurringSettings) {
          return NextResponse.json(
            { error: "Recurring settings are required for recurring invoices" },
            { status: 400 }
          );
        }

        // Create subscription items
        const subscriptionItems = items.map((item: Record<string, unknown>) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name as string,
              description: item.description as string | undefined,
            },
            unit_amount: item.price as number,
            recurring: {
              interval: recurringSettings.interval,
              interval_count: recurringSettings.intervalCount || 1,
            },
          },
          quantity: item.quantity as number,
        }));

        stripeInvoice = await stripe.createRecurringInvoiceSchedule(
          member.stripeCustomerId,
          subscriptionItems,
          new Date(recurringSettings.startDate),
          recurringSettings.endDate
            ? new Date(recurringSettings.endDate)
            : undefined
        );

        localInvoiceData = {
          memberId: params.mid,
          locationId: params.id,
          description:
            description ||
            `Recurring invoice for ${member.firstName} ${member.lastName}`,
          items: items,
          total: items.reduce((sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number), 0),
          subtotal: items.reduce(
            (sum: number, item: Record<string, unknown>) => sum + (item.price as number) * (item.quantity as number),
            0
          ),
          tax: tax || 0,
          discount: discount || 0,
          currency: "usd",
          status: "draft" as const,
          dueDate: new Date(recurringSettings.startDate),
          paymentType: paymentType === "cash" ? ("cash" as const) : ("card" as const),
          invoiceType: "recurring" as const,
          metadata: {
            stripeScheduleId: stripeInvoice.id,
            type: type,
            recurringSettings: recurringSettings,
          },
        };
      }

      if (!localInvoiceData) {
        return NextResponse.json(
          { error: "Invalid invoice type or missing data" },
          { status: 400 }
        );
      }

      // Store reference in local database
      const [invoice] = await db
        .insert(memberInvoices)
        .values(localInvoiceData as unknown as typeof memberInvoices.$inferInsert)
        .returning();

      // Schedule reminder for one-off Stripe invoices
      if (type === "one-off" && invoice.dueDate) {
        await scheduleOneOffInvoiceReminders(invoice.id, new Date(invoice.dueDate), params.id);
      }

      return NextResponse.json(
        {
          success: true,
          invoice: invoice,
          stripeInvoice: stripeInvoice,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to create invoice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
