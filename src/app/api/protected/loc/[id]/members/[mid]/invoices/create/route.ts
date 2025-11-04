import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices, members, transactions, memberSubscriptions, locationState, integrations, locations } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import { getStripeCustomer } from "@/libs/server/stripe";
import type Stripe from "stripe";
import { createMonstroApiClient } from "@/libs/api";

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
      paymentMethod,
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
        with: { plan: true },
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

      // Create invoice with subscription details
      const subscriptionInvoiceData = {
        memberId: params.mid,
        locationId: params.id,
        memberSubscriptionId: subscription.id,
        description: `${subscription.plan.name} - Billing Period`,
        items: [{
          name: subscription.plan.name,
          description: subscription.plan.description || "",
          quantity: 1,
          price: subscription.plan.price, // Already in cents
        }],
        total: subscription.plan.price,
        subtotal: subscription.plan.price,
        tax: 0, // TODO: Implement add tax
        discount: 0,
        currency: subscription.plan.currency || "usd",
        status: "draft" as const,
        dueDate: new Date(subscription.currentPeriodEnd),
        paymentMethod: subscription.paymentMethod as "manual" | "cash",
        invoiceType: "recurring" as const,
        forPeriodStart: new Date(subscription.currentPeriodStart),
        forPeriodEnd: new Date(subscription.currentPeriodEnd),
        metadata: {
          type: "from-subscription",
          subscriptionId: subscription.id,
        },
      };

      const invoice = await db.transaction(async (tx) => {
        // Create invoice as draft
        const [newInvoice] = await tx
          .insert(memberInvoices)
          .values(subscriptionInvoiceData)
          .returning();

        // Create incomplete transaction
        await tx
          .insert(transactions)
          .values({
            memberId: params.mid,
            locationId: params.id,
            invoiceId: newInvoice.id,
            subscriptionId: subscription.id,
            description: `${subscription.plan.name} - Recurring Payment`,
            type: "inbound",
            status: "incomplete",
            paymentMethod: subscription.paymentMethod,
            amount: subscription.plan.price,
            currency: subscription.plan.currency || "usd",
            created: new Date(),
          });

        return newInvoice;
      });

      return NextResponse.json(invoice, { status: 201 });
    }

    // Manual payment flow - fully manual, no Stripe
    if (paymentMethod === "manual") {
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
            paymentMethod: "manual" as const,
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
            paymentMethod: localInvoiceData.paymentMethod,
            amount: localInvoiceData.total,
            currency: localInvoiceData.currency,
            created: new Date(),
          });

        return newInvoice;
      });

      // Send invoice reminder email immediately for manual one-off invoices (only for plan_id >= 2, no Stripe)
      try {
        const locState = await db.query.locationState.findFirst({
          where: eq(locationState.locationId, params.id)
        });
        
        if (locState?.planId && locState.planId >= 2) {
          // Check if location has NO Stripe integration
          const hasStripe = await db.query.integrations.findFirst({
            where: and(
              eq(integrations.locationId, params.id),
              eq(integrations.service, 'stripe')
            )
          });
          
          if (!hasStripe) {
            // Fetch location details
            const location = await db.query.locations.findFirst({
              where: eq(locations.id, params.id)
            });
            
            if (location) {
              const apiClient = createMonstroApiClient();
              await apiClient.post('/protected/locations/email', {
                recipient: member.email,
                subject: `Invoice: ${invoice.description}`,
                template: 'InvoiceReminderEmail',
                data: {
                  member: {
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                  },
                  invoice: {
                    id: invoice.id,
                    total: invoice.total,
                    dueDate: invoice.dueDate.toISOString(),
                    description: invoice.description,
                    items: invoice.items as any[],
                  },
                  location: {
                    name: location.name,
                    address: location.address || '',
                  },
                  monstro: {
                    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
                    privacyUrl: 'https://mymonstro.com/privacy',
                    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
                  },
                }
              });
              console.log(`📧 Sent invoice reminder email for invoice ${invoice.id}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to send invoice reminder email:', error);
        // Don't fail the request if email fails
      }

      return NextResponse.json(invoice, { status: 201 });
    }

    // Cash payment flow - Stripe handles invoice but payment is cash
    // Stripe flow - card payment
    if (paymentMethod === "cash" || paymentMethod === "stripe" || !paymentMethod) {
      // Validate Stripe customer exists
      if (!member?.stripeCustomerId) {
        return NextResponse.json(
          { error: "Member does not have a Stripe customer ID" },
          { status: 400 }
        );
      }

      // Get Stripe customer instance
      const stripe = await getStripeCustomer({ id: params.id, mid: params.mid });

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
              description: `${item.name}${
                item.description ? ` - ${item.description}` : ""
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
          paymentMethod: paymentMethod === "cash" ? ("cash" as const) : ("stripe" as const),
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
          paymentMethod: paymentMethod === "cash" ? ("cash" as const) : ("stripe" as const),
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
