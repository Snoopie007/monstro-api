import { db } from "@/db/db";
import { MemberPlan } from "@/types";
import { MonstroPlan, PackagePaymentPlan } from "@/types/admin";
import { isAfter, addDays, addWeeks } from "date-fns";
import Stripe from "stripe";

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const isProd = process.env.NODE_ENV === "production";

abstract class BaseStripePayments {
  protected _stripe: Stripe;
  protected _customer: string | null = null;

  constructor(key: string) {
    this._stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      appInfo: {
        name: "My Monstro",
        url: "https://mymonstro.com",
      },
    });
  }

  public setCustomer(customer: string) {
    this._customer = customer;
    return this;
  }

  public async createCustomer(customer: Customer, token: string | undefined, metadata?: Record<string, any>) {
    const c = await this._stripe.customers.create({
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      ...(token && { source: token }),
      metadata: metadata || undefined,
    });
    this.setCustomer(c.id);
    return c;
  }

  async constructEvent(body: Buffer, sig: string, key: string): Promise<Stripe.Event> {
    return await this._stripe.webhooks.constructEvent(body, sig, key);
  }

  async updatePaymentMethod(id: string, update: Stripe.PaymentMethodUpdateParams) {
    return await this._stripe.paymentMethods.update(id, update);
  }

  async createSetupIntent(customerId: string, cardId: string) {
    const option: Stripe.SetupIntentCreateParams = {
      automatic_payment_methods: { enabled: true },
      customer: customerId,
      usage: "off_session",
      payment_method: cardId,
    };
    return await this._stripe.setupIntents.create(option);
  }

  async retrievePaymentMethod(customerId: string, paymentId: string) {
    return await this._stripe.customers.retrievePaymentMethod(customerId, paymentId);
  }

  async updateCustomer(updates: Stripe.CustomerUpdateParams) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    return await this._stripe.customers.update(this._customer, updates);
  }

  async getPaymentMethods(customerId: string, limit?: number) {
    return await this._stripe.customers.listPaymentMethods(customerId, { limit });
  }

  async setupIntent(source: string, type?: string) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const option: Record<string, any> = {
      customer: this._customer,
      confirm: true,
      payment_method_data: {
        type: "card",
        card: {
          token: source,
        },
      },
      payment_method_types: type ? [type] : ["card"],
      expand: ["payment_method"],
    };
    const { client_secret, payment_method } = await this._stripe.setupIntents.create(option);

    return { clientSecret: client_secret as string, paymentMethod: payment_method as Stripe.PaymentMethod };
  }

  async getSubscriptions(customerId: string, limit?: number) {
    return await this._stripe.subscriptions.list({ customer: customerId, limit: 10 });
  }

  async getCharges(limit?: number) {
    const res = await this._stripe.charges.list({ limit: limit || 10 });
    return res.data;
  }

  async getInvoices(limit?: number) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const res = await this._stripe.invoices.list({ customer: this._customer, limit: limit || 10 });
    return res.data;
  }

  async getLatestInvoice() {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const res = await this._stripe.invoices.list({ customer: this._customer, limit: 1 });
    return res.data[0];
  }

  async retryPayment(invoiceId: string, paymentMethod: string) {
    return await this._stripe.invoices.pay(invoiceId, { payment_method: paymentMethod });
  }

  async refund(chargeId: string) {
    return await this._stripe.refunds.create({ charge: chargeId });
  }

  async calculateTax(amount: number, quantity: number, reference: string) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const res = await this._stripe.tax.calculations.create({
      currency: "usd",
      customer: this._customer,
      line_items: [
        {
          amount,
          quantity,
          reference,
        },
      ],
    });
    return res;
  }
}

interface VendorPaymentIntentOptions {
  authorizeOnly?: boolean;
  statement?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface VendorPaymentIntentResponse {
  clientSecret: string;
  paymentIntent: Stripe.PaymentIntent;
}

class VendorStripePayments extends BaseStripePayments {
  constructor() {
    super(process.env.STRIPE_SECRET_KEY!);
  }

  async connectOAuth(code: string, scope?: string) {
    return await this._stripe.oauth.token({
      grant_type: "authorization_code",
      code,
      scope: scope || "read_write",
    });
  }

  async createPaymentIntent(
    amount: number,
    cardId: string | undefined,
    options?: VendorPaymentIntentOptions
  ): Promise<VendorPaymentIntentResponse> {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const option: Stripe.PaymentIntentCreateParams = {
      amount,
      description: options?.description,
      automatic_payment_methods: { enabled: true },
      currency: "usd",
      confirm: true,
      capture_method: options?.authorizeOnly ? "manual" : "automatic",
      customer: this._customer,
      setup_future_usage: "off_session",
      statement_descriptor: "Monstro",
      metadata: options?.metadata || undefined,
      return_url: "https://mymonstro.com",
    };

    if (cardId) {
      option.payment_method = cardId;
    }

    const paymentIntent = await this._stripe.paymentIntents.create(option);
    return { clientSecret: paymentIntent.client_secret as string, paymentIntent: paymentIntent as Stripe.PaymentIntent };
  }

  async createSubscription(plan: MonstroPlan, metadata: Record<string, any>, trial?: number) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }

    const options: Stripe.SubscriptionCreateParams = {
      customer: this._customer,
      description: `Monstro ${plan.name} Subscription`,
      items: [{ price: plan.priceId! }],
      metadata,
    };
    if (trial) {
      options.trial_period_days = trial;
    }
    return this._stripe.subscriptions.create(options);
  }

  async createPaymentPlan(
    plan: PackagePaymentPlan,
    coupon: string | undefined,
    metadata: Record<string, any>,
    paymentMethodId?: string | undefined
  ) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const today = new Date();
    const startDate = addDays(today, plan.trial || 0);
    const endDate = addWeeks(startDate, plan.length * 4);

    const options: Stripe.SubscriptionCreateParams = {
      customer: this._customer,
      items: [
        {
          price: isProd ? plan.priceId! : plan.testPriceId!,
        },
      ],
      cancel_at: Math.floor(endDate.getTime() / 1000),
      metadata,
    };

    if (paymentMethodId) {
      options.default_payment_method = paymentMethodId;
    }

    if (coupon) {
      options.discounts = [{ coupon }];
    }

    if (plan.trial) {
      options.trial_end = Math.floor(startDate.getTime() / 1000);
    }

    return this._stripe.subscriptions.create(options);
  }

  async createPackageSubscriptions(metadata: Record<string, any>, paymentMethodId?: string | undefined) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const phaseOneCoupon = isProd ? "qHgZNW46" : "QuJSpLOZ";
    const phaseOnePrice = isProd ? "price_1R9XXWDePDUzIffAbDo18Rtf" : "price_1R4UUNDePDUzIffArAlN6mq6";
    const phaseTwoPrice = isProd ? "price_1R4WeVDePDUzIffAZQPObJhE" : "price_1R4SG5DePDUzIffAz3GU05uZ";

    const options: Stripe.SubscriptionScheduleCreateParams = {
      customer: this._customer,
      start_date: "now",
      end_behavior: "release",
      phases: [
        {
          items: [{ price: phaseOnePrice, discounts: [{ coupon: phaseOneCoupon }] }],
          iterations: 12,
          billing_cycle_anchor: "automatic",
          currency: "usd",
          ...(paymentMethodId && { default_payment_method: paymentMethodId }),
          collection_method: "charge_automatically",
          metadata,
        },
        {
          items: [{ price: phaseTwoPrice }],
          billing_cycle_anchor: "automatic",
          currency: "usd",
          ...(paymentMethodId && { default_payment_method: paymentMethodId }),
          collection_method: "charge_automatically",
          metadata,
        },
      ],
      metadata,
      expand: ["subscription"],
    };
    const schedule = await this._stripe.subscriptionSchedules.create(options);

    return schedule;
  }

  async updateSchedule(scheduleId: string, updates: Stripe.SubscriptionScheduleUpdateParams) {
    return await this._stripe.subscriptionSchedules.update(scheduleId, updates);
  }

  async createGHLSubscription(metadata: Record<string, any>) {
    const price = isProd ? "price_1R4WblDePDUzIffAvMQrZRFE" : "price_1R4S9xDePDUzIffAFUKu0ROH";
    const coupon = isProd ? "kQcIf0sW" : "7Yt7dfGs";
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const options: Stripe.SubscriptionCreateParams = {
      customer: this._customer,
      description: `Monstro Marketing Suite Subscription`,
      items: [{ price, discounts: [{ coupon }] }],
      metadata,
    };
    return this._stripe.subscriptions.create(options);
  }
}

type BaseStripeSettings = {
  description?: string;
  applicationFeePercent?: number;
  currency?: string;
  returnUrl?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
};

interface MemberSubscriptionSettings extends BaseStripeSettings {
  cancelAt: Date | null | undefined;
  trialEnd: Date | null | undefined;
  allowProration?: boolean;
}

interface PaymentIntentSettings extends BaseStripeSettings {
  authorizeOnly?: boolean;
}

class MemberStripePayments extends BaseStripePayments {
  constructor(key: string) {
    super(key);
  }

  async createPaymentIntent(amount: number, settings?: PaymentIntentSettings) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }

    const applicationFeeAmount = Math.floor(amount * ((settings?.applicationFeePercent || 0) / 100));

    const option: Stripe.PaymentIntentCreateParams = {
      amount,
      description: settings?.description,
      automatic_payment_methods: { enabled: true },
      currency: settings?.currency || "usd",
      confirm: true,
      customer: this._customer,
      setup_future_usage: "off_session",
      application_fee_amount: applicationFeeAmount,
      payment_method: settings?.paymentMethod || undefined,
      capture_method: settings?.authorizeOnly ? "manual" : "automatic",
      return_url: settings?.returnUrl || "https://unknown.com",
      expand: ["payment_method"],
    };

    const { client_secret, payment_method } = await this._stripe.paymentIntents.create(option);
    return { clientSecret: client_secret as string, paymentMethod: payment_method as Stripe.PaymentMethod };
  }

  async createSubscription(plan: MemberPlan, startDate: Date | undefined, settings: MemberSubscriptionSettings) {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const { trialEnd, paymentMethod, applicationFeePercent, allowProration, cancelAt, ...rest } = settings;

    if (!plan.stripePriceId) {
      throw new Error("Price not found");
    }
    const isAllowProration = plan.interval === "month" || plan.interval === "year";
    const options: Stripe.SubscriptionCreateParams = {
      ...rest,
      customer: this._customer,
      automatic_tax: { enabled: true },
      description: `Subscription to ${plan.name}`,
      items: [{ price: plan.stripePriceId as string }],
      collection_method: "charge_automatically",
      application_fee_percent: applicationFeePercent || 0,
      default_payment_method: paymentMethod || undefined,
      cancel_at: cancelAt ? cancelAt.getTime() / 1000 : undefined,
      trial_end: trialEnd ? trialEnd.getTime() / 1000 : undefined,
    };

    if (isAllowProration) {
      if (plan.billingAnchorConfig) {
        options.billing_cycle_anchor_config = plan.billingAnchorConfig;
      }
      if (startDate && isAfter(startDate, new Date())) {
        options.proration_behavior = allowProration || plan.allowProration ? "create_prorations" : "none";
        options.billing_cycle_anchor = startDate.getTime() / 1000;
      }
    }

    return this._stripe.subscriptions.create(options);
  }

  createSubSchedule(priceId: string, startDate: Date, settings: MemberSubscriptionSettings): Promise<Stripe.SubscriptionSchedule> {
    if (!this._customer) {
      throw new Error("Customer not set");
    }
    const { cancelAt, trialEnd, paymentMethod, applicationFeePercent, ...rest } = settings;

    const options: Stripe.SubscriptionScheduleCreateParams = {
      customer: this._customer,
      start_date: new Date(startDate).getTime() / 1000,
      end_behavior: "release",
      phases: [
        {
          items: [{ price: priceId }],
          billing_cycle_anchor: "automatic",
          application_fee_percent: applicationFeePercent || 0,
          ...(cancelAt && { end_date: new Date(cancelAt).getTime() / 1000 }),
          currency: "usd",
          collection_method: "charge_automatically",
        },
      ],
      ...rest,
    };
    return this._stripe.subscriptionSchedules.create(options);
  }

  async createStripeProduct(data: MemberPlan, locationId: string): Promise<Stripe.Price> {
        const { interval, price, intervalThreshold } = data
        const product = await this._stripe.products.create({
            name: data.name,
            description: data.description,
            active: true,
            default_price_data: {

                currency: data.currency || "usd",
                recurring: {
                    interval: interval as Stripe.PriceCreateParams.Recurring.Interval,
                    interval_count: intervalThreshold || 1
                },
                unit_amount: price,
                metadata: {
                    locationId: locationId,
                    planId: data.id!
                }
            },
            metadata: {
                locationId: locationId,
            },
            expand: ["default_price"]
        });


        return product.default_price as Stripe.Price
    }

  async retrieveTaxSettings() {
    const res = await this._stripe.tax.settings.retrieve();
    return res;
  }

  async updateTaxSettings(settings: Stripe.Tax.SettingsUpdateParams) {
    return await this._stripe.tax.settings.update(settings);
  }

  async getTaxRegistrations() {
    const res = await this._stripe.tax.registrations.list();
    return res.data;
  }

  async updateTaxRegistration(registrationId: string, updates: Stripe.Tax.RegistrationUpdateParams) {
    return await this._stripe.tax.registrations.update(registrationId, updates);
  }

  async createTaxRegistration(
    type: Stripe.Tax.RegistrationCreateParams.CountryOptions.Us.Type,
    state: string,
    country: string
  ) {
    return await this._stripe.tax.registrations.create({
      country: country,
      country_options: {
        us: {
          state,
          type,
        },
      },
      active_from: "now",
    });
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      price?: string;
      cancel_at_period_end?: boolean;
      proration_behavior?: "always_invoice" | "create_prorations" | "none";
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Subscription> {
    const params: Stripe.SubscriptionUpdateParams = {
      ...(updates.price && {
        items: [
          {
            price: updates.price,
          },
        ],
      }),
      cancel_at_period_end: updates.cancel_at_period_end,
      proration_behavior: updates.proration_behavior,
      metadata: updates.metadata,
    };

    return this._stripe.subscriptions.update(subscriptionId, params);
  }

  async updateStripeProduct(
    priceId: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Price> {
    // Retrieve the existing price to get the product ID
    const price = await this._stripe.prices.retrieve(priceId);

    // Update the product metadata (name, description)
    if (updates.name || updates.description) {
      await this._stripe.products.update(price.product as string, {
        name: updates.name,
        description: updates.description,
        metadata: updates.metadata,
      });
    }

    // If price changed, search for an existing price or create a new one
    if (updates.price !== undefined && updates.price !== price.unit_amount) {
      // Search for an existing price with the desired amount
      const existingPrices = await this._stripe.prices.list({
        product: price.product as string,
        active: true,
        currency: price.currency || "usd",
      });

      let newPrice = existingPrices.data.find((p) => p.unit_amount === updates.price);

      if (!newPrice) {
        // Create a new price if no matching price exists
        newPrice = await this._stripe.prices.create({
          product: price.product as string,
          currency: price.currency || "usd",
          unit_amount: updates.price,
          recurring: price.recurring
            ? {
                interval: price.recurring.interval,
                interval_count: price.recurring.interval_count,
              }
            : undefined,
          metadata: {
            ...updates.metadata,
            previous_price_id: priceId,
          },
        });
      }

      // Optionally update the product's default price to the new price
      await this._stripe.products.update(price.product as string, {
        default_price: newPrice.id,
      });

      return newPrice;
    }

    return price;
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = false
  ): Promise<Stripe.Subscription | { id: string; object: "subscription"; deleted: true }> {
    if (cancelAtPeriodEnd) {
      return this._stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return this._stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async createRefund(params: {
    payment_intent: string;
    amount?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    return this._stripe.refunds.create({
      payment_intent: params.payment_intent,
      amount: params.amount,
      reason: params.reason,
      metadata: params.metadata,
    });
  }
}

async function getStripeCustomer(params: { id: number; mid: number }) {
  const memberLocation = await db.query.memberLocations.findFirst({
    where: (memberLocation, { eq, and }) =>
      and(eq(memberLocation.memberId, params.mid), eq(memberLocation.locationId, params.id)),
  });

  if (!memberLocation || !memberLocation.stripeCustomerId) {
    throw new Error("Member location not found");
  }

  const integrations = await db.query.integrations.findFirst({
    where: (integration, { eq, and }) =>
      and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
  });

  if (!integrations?.secretKey) {
    throw new Error("Stripe integration not found");
  }
  const stripe = new MemberStripePayments(integrations.secretKey).setCustomer(memberLocation.stripeCustomerId);
  return stripe;
}

export { VendorStripePayments, MemberStripePayments, getStripeCustomer };