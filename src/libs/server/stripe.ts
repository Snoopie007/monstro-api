import { db } from "@/db/db";
import { MemberPlan } from "@/types";
import { MonstroPlan } from "@/types/admin";
import { AddressParam } from "@stripe/stripe-js";
import { isSameDay, addMonths, isAfter } from "date-fns";
import Stripe from "stripe";

type Customer = {
	firstName: string;
	lastName: string | null;
	email: string;
	phone: string | null;
	address?: AddressParam;
};

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

const isProd = process.env.NODE_ENV === "production";
const STRIPE_FEE_PERCENT = 2.9;
const STRIPE_FEE_AMOUNT = 0.3;

function calculatePercentage(amount: number) {
	const additionalPercentage = Number(
		((STRIPE_FEE_AMOUNT / (amount / 100)) * 100).toFixed(2)
	);
	return additionalPercentage + STRIPE_FEE_PERCENT;
}

abstract class BaseStripePayments {
	protected _stripe: Stripe;
	protected _customer: string | null = null;

	constructor(key: string) {
		this._stripe = new Stripe(key, {
			apiVersion: "2025-05-28.basil",
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
	async connectOAuth(code: string, scope?: string) {
		return await this._stripe.oauth.token({
			grant_type: "authorization_code",
			code,
			scope: scope || "read_write",
		});
	}

	public async createCustomer(
		customer: Customer,
		token: string | undefined,
		metadata?: Record<string, any>
	) {
		const c = await this._stripe.customers.create({
			name: `${customer.firstName} ${customer.lastName}`,
			email: customer.email,
			phone: customer.phone || undefined,
			...(token && { source: token }),
			...(customer.address && {
				address: {
					...customer.address,
					country: customer.address.country || "US",
				},
			}),
			metadata: metadata || undefined,
		});
		this.setCustomer(c.id);
		return c;
	}

	async constructEvent(
		body: Buffer,
		sig: string,
		key: string
	): Promise<Stripe.Event> {
		return await this._stripe.webhooks.constructEvent(body, sig, key);
	}

	async updatePaymentMethod(
		id: string,
		update: Stripe.PaymentMethodUpdateParams
	) {
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
		return await this._stripe.customers.retrievePaymentMethod(
			customerId,
			paymentId
		);
	}

	async getInvoice(invoiceId: string) {
		return await this._stripe.invoices.retrieve(invoiceId);
	}

	async getPaymentIntent(paymentIntentId: string) {
		return await this._stripe.paymentIntents.retrieve(paymentIntentId);
	}

	async updateCustomer(updates: Stripe.CustomerUpdateParams) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		return await this._stripe.customers.update(this._customer, updates);
	}

	async getPaymentMethods(customerId: string, limit?: number) {
		return await this._stripe.customers.listPaymentMethods(customerId, {
			limit,
		});
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
		const { client_secret, payment_method } =
			await this._stripe.setupIntents.create(option);

		return {
			clientSecret: client_secret as string,
			paymentMethod: payment_method as Stripe.PaymentMethod,
		};
	}

	async getSubscriptions(customerId: string, limit?: number) {
		const list = await this._stripe.subscriptions.list({
			customer: customerId,
			limit: limit || 10,
		});
		return list;
	}

	async getCharges(limit?: number) {
		const res = await this._stripe.charges.list({ limit: limit || 10 });
		return res.data;
	}

	async getInvoices(limit?: number) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		const res = await this._stripe.invoices.list({
			customer: this._customer,
			limit: limit || 10,
		});
		return res.data;
	}

	async retryPayment(invoiceId: string, paymentMethod: string) {
		return await this._stripe.invoices.pay(invoiceId, {
			payment_method: paymentMethod,
		});
	}

	async refund(chargeId: string) {
		return await this._stripe.refunds.create({ charge: chargeId });
	}

	async removeAccount(accountId: string) {
		// Validate accountId to prevent empty string causing invalid API calls
		if (!accountId || accountId.trim() === "") {
			throw new Error("Invalid account ID: cannot be empty");
		}
		return await this._stripe.accounts.del(accountId);
	}

	async getSubscription(subscriptionId: string) {
		return await this._stripe.subscriptions.retrieve(subscriptionId, {
			expand: [
				"latest_invoice",
				"latest_invoice.payments",
				"latest_invoice.payment_intent",
			],
		});
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
	async attachPaymentMethod(paymentMethodId: string) {
		if (!this._customer) {
			throw new Error("Customer ID is required");
		}

		try {
			const paymentMethod = await this._stripe.paymentMethods.attach(
				paymentMethodId,
				{
					customer: this._customer,
				}
			);

			return paymentMethod;
		} catch (error) {
			console.error("Error attaching payment method:", error);
			throw error;
		}
	}

	/**
	 * Detach a payment method from a customer
	 */
	async detachPaymentMethod(paymentMethodId: string) {
		try {
			const paymentMethod = await this._stripe.paymentMethods.detach(
				paymentMethodId
			);
			return paymentMethod;
		} catch (error) {
			console.error("Error detaching payment method:", error);
			throw error;
		}
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

	/**
	 * Create a payment intent
	 * @param amount - The amount to charge
	 * @param cardId - The card id to charge
	 * @param options - The options for the payment intent
	 * @returns The client secret for the payment intent
	 */
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
			return_url: "https://www.monstro-x.com",
		};

		if (cardId) {
			option.payment_method = cardId;
		}

		const paymentIntent = await this._stripe.paymentIntents.create(option);
		return {
			clientSecret: paymentIntent.client_secret as string,
			paymentIntent: paymentIntent as Stripe.PaymentIntent,
		};
	}

	async createSubscription(
		plan: MonstroPlan,
		metadata: Record<string, any>,
		trial?: number,
		paymentMethodId?: string | undefined
	) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}

		const options: Stripe.SubscriptionCreateParams = {
			customer: this._customer,
			description: `Monstro ${plan.name} Subscription`,
			...(paymentMethodId && { default_payment_method: paymentMethodId }),
			items: [{ price: isProd ? plan.priceId! : plan.testPriceId! }],
			metadata,
		};
		if (trial) {
			options.trial_period_days = trial;
		}
		return this._stripe.subscriptions.create(options);
	}

	async createScaleUpgrade(
		metadata: Record<string, any>,
		paymentMethodId?: string | undefined
	) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		const today = new Date();
		const endDate = addMonths(today, 12);

		const options: Stripe.SubscriptionCreateParams = {
			customer: this._customer,
			items: [{
				price: isProd ? '#' : 'price_1SNgjhDePDUzIffADGAKBvN3',
			}],
			cancel_at: Math.floor(endDate.getTime() / 1000),
			metadata,
		};

		if (paymentMethodId) {
			options.default_payment_method = paymentMethodId;
		}

		return this._stripe.subscriptions.create(options);
	}

	// async createPackageSubscriptions(
	// 	metadata: Record<string, any>,
	// 	paymentMethodId?: string | undefined
	// ) {
	// 	if (!this._customer) {
	// 		throw new Error("Customer not set");
	// 	}
	// 	const phaseOneCoupon = isProd ? "qHgZNW46" : "QuJSpLOZ";
	// 	const phaseOnePrice = isProd
	// 		? "price_1R9XXWDePDUzIffAbDo18Rtf"
	// 		: "price_1R4UUNDePDUzIffArAlN6mq6";
	// 	const phaseTwoPrice = isProd
	// 		? "price_1R4WeVDePDUzIffAZQPObJhE"
	// 		: "price_1R4SG5DePDUzIffAz3GU05uZ";

	// 	const commonPhaseOptions = {
	// 		billing_cycle_anchor: "automatic" as const,
	// 		currency: "usd",
	// 		...(paymentMethodId && { default_payment_method: paymentMethodId }),
	// 		collection_method: "charge_automatically" as const,
	// 		metadata,
	// 	};

	// 	const options: Stripe.SubscriptionScheduleCreateParams = {
	// 		customer: this._customer,
	// 		start_date: "now",
	// 		end_behavior: "release",
	// 		phases: [
	// 			{
	// 				items: [
	// 					{ price: phaseOnePrice, discounts: [{ coupon: phaseOneCoupon }] },
	// 				],
	// 				iterations: 12,
	// 				...commonPhaseOptions,
	// 			},
	// 			{
	// 				items: [{ price: phaseTwoPrice }],
	// 				...commonPhaseOptions,
	// 			},
	// 		],
	// 		metadata,
	// 		expand: ["subscription"],
	// 	};
	// 	const schedule = await this._stripe.subscriptionSchedules.create(options);

	// 	return schedule;
	// }

	// async updateSchedule(scheduleId: string, updates: Stripe.SubscriptionScheduleUpdateParams) {
	// 	return await this._stripe.subscriptionSchedules.update(scheduleId, updates);
	// }

	async createGHLSubscription(metadata: Record<string, any>, paymentMethodId?: string | undefined) {
		const price = isProd ? "price_1R4WblDePDUzIffAvMQrZRFE" : "price_1R4S9xDePDUzIffAFUKu0ROH";
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		const options: Stripe.SubscriptionCreateParams = {
			customer: this._customer,
			description: `Monstro Marketing Suite Subscription`,
			items: [{ price }],
			metadata,
			...(paymentMethodId && { default_payment_method: paymentMethodId }),
		};
		return this._stripe.subscriptions.create(options);
	}
}

class MemberStripePayments extends BaseStripePayments {
	private _accountId: string | null;
	constructor(accountId?: string, secretKey?: string) {
		super(secretKey || process.env.STRIPE_MEMBER_SECRET_KEY!);
		this._accountId = accountId || null;
	}
	async getCharges(limit?: number) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		const res = await this._stripe.charges.list({
			limit: limit || 10,
			customer: this._customer,
		});
		return res.data;
	}

	async createPaymentIntent(amount: number, settings?: PaymentIntentSettings) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		const percentage =
			calculatePercentage(amount) + (settings?.applicationFeePercent || 0);
		const applicationFeeAmount = Math.floor(
			(amount / 100) * (percentage / 100)
		);

		const option: Stripe.PaymentIntentCreateParams = {
			amount,
			description: settings?.description,
			transfer_data: {
				destination: this._accountId,
			},
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

		const { client_secret, payment_method } =
			await this._stripe.paymentIntents.create(option);
		return {
			clientSecret: client_secret as string,
			paymentMethod: payment_method as Stripe.PaymentMethod,
		};
	}

	async createSubscription(
		plan: MemberPlan,
		startDate: Date | undefined,
		settings: MemberSubscriptionSettings
	) {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}
		const {
			trialEnd,
			paymentMethod,
			applicationFeePercent,
			allowProration,
			cancelAt,
			...rest
		} = settings;

		if (!plan.stripePriceId) {
			throw new Error("Price not found");
		}
		const isAllowProration =
			plan.interval === "month" || plan.interval === "year";
		const taxSettings = await this.retrieveTaxSettings();
		const stripePercentage = calculatePercentage(plan.price);

		const automaticTax = taxSettings.status === "active";

		const accountDestination = {
			type: "account" as const,
			account: this._accountId,
		};

		const options: Stripe.SubscriptionCreateParams = {
			...rest,
			customer: this._customer,
			transfer_data: {
				destination: this._accountId,
			},
			automatic_tax: { enabled: automaticTax, liability: accountDestination },
			invoice_settings: { issuer: accountDestination },
			description: `Subscription to ${plan.name}`,
			items: [{ price: plan.stripePriceId as string }],
			collection_method: "charge_automatically",
			default_payment_method: paymentMethod || undefined,
			application_fee_percent: stripePercentage + (applicationFeePercent || 0),
			cancel_at: cancelAt ? Math.floor(cancelAt.getTime() / 1000) : undefined,
		};

		if (trialEnd) {
			options.trial_end = Math.floor(trialEnd.getTime() / 1000);
		}

		if (isAllowProration) {
			if (plan.billingAnchorConfig) {
				options.billing_cycle_anchor_config = plan.billingAnchorConfig;
			}
			if (startDate && isAfter(startDate, new Date())) {
				options.proration_behavior =
					allowProration || plan.allowProration ? "create_prorations" : "none";
				options.billing_cycle_anchor = Math.floor(startDate.getTime() / 1000);
			}
		}

		return this._stripe.subscriptions.create(options);
	}

	createSubSchedule(
		priceId: string,
		startDate: Date,
		settings: MemberSubscriptionSettings
	): Promise<Stripe.SubscriptionSchedule> {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}
		const {
			cancelAt,
			trialEnd,
			paymentMethod,
			applicationFeePercent,
			...rest
		} = settings;

		const accountDestination = {
			type: "account" as const,
			account: this._accountId,
		};
		const options: Stripe.SubscriptionScheduleCreateParams = {
			customer: this._customer,
			start_date: new Date(startDate).getTime() / 1000,
			end_behavior: "release",

			phases: [
				{
					items: [{ price: priceId }],
					transfer_data: {
						destination: this._accountId,
					},

					invoice_settings: { issuer: accountDestination },
					billing_cycle_anchor: "automatic",
					application_fee_percent: applicationFeePercent || 0,
					...(cancelAt && { end_date: Math.floor(cancelAt.getTime() / 1000) }),
					currency: "usd",
					collection_method: "charge_automatically",
				},
			],
			...rest,
		};
		return this._stripe.subscriptionSchedules.create(options);
	}

	async createStripeProduct(
		data: MemberPlan,
		metadata: Record<string, any>
	): Promise<Stripe.Price> {
		const { interval, price, intervalThreshold } = data;
		const product = await this._stripe.products.create({
			name: data.name,
			description: data.description,
			active: true,
			default_price_data: {
				currency: data.currency || "usd",
				recurring: {
					interval: interval as Stripe.PriceCreateParams.Recurring.Interval,
					interval_count: intervalThreshold || 1,
				},
				unit_amount: price,
				metadata,
			},
			metadata,
			expand: ["default_price"],
		});

		return product.default_price as Stripe.Price;
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

	async updateTaxRegistration(
		registrationId: string,
		updates: Stripe.Tax.RegistrationUpdateParams
	) {
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
		sid: string,
		updates: Partial<Stripe.SubscriptionUpdateParams>
	): Promise<Stripe.Subscription> {
		const commonPhaseOptions: Stripe.SubscriptionUpdateParams = {
			...updates,
		};

		return this._stripe.subscriptions.update(sid, commonPhaseOptions);
	}

	async cancelSubscription(
		subscriptionId: string,
		endOfPeriod: boolean,
		cancelDate?: Date
	) {
		const today = new Date();
		if (cancelDate && isSameDay(cancelDate, today)) {
			return this._stripe.subscriptions.cancel(subscriptionId);
		} else {
			return this._stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: endOfPeriod,
				...(!endOfPeriod && {
					cancel_at: cancelDate ? cancelDate.getTime() / 1000 : undefined,
				}),
			});
		}
	}

	async createRefund(params: {
		payment_intent?: string;
		charge?: string;
	}): Promise<Stripe.Refund> {
		return this._stripe.refunds.create({
			...(params.payment_intent && { payment_intent: params.payment_intent }),
			...(params.charge && { charge: params.charge }),
			refund_application_fee: false,
			reverse_transfer: true,
			reason: "requested_by_customer",
		});
	}

	// Enhanced invoice creation methods for one-off invoices
	async createInvoiceItem(
		customerId: string,
		itemData: {
			amount: number;
			currency: string;
			description: string;
			metadata?: Record<string, any>;
		}
	): Promise<Stripe.InvoiceItem> {
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		return await this._stripe.invoiceItems.create({
			customer: customerId,
			amount: itemData.amount,
			currency: itemData.currency,
			description: itemData.description,
			metadata: itemData.metadata || {},
		});
	}

	async createDraftInvoice(
		customerId: string,
		options: {
			collection_method: "charge_automatically" | "send_invoice";
			description?: string;
			due_date?: number;
			metadata?: Record<string, any>;
			auto_advance?: boolean;
			pending_invoice_items_behavior?: "include" | "exclude";
		}
	): Promise<Stripe.Invoice> {
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		const accountDestination = {
			type: "account" as const,
			account: this._accountId,
		};

		return await this._stripe.invoices.create({
			customer: customerId,
			collection_method: options.collection_method,
			description: options.description,
			due_date: options.due_date,
			metadata: options.metadata || {},
			auto_advance: options.auto_advance || false,
			on_behalf_of: this._accountId,
			issuer: accountDestination,
			transfer_data: {
				destination: this._accountId,
			},
			pending_invoice_items_behavior:
				options.pending_invoice_items_behavior || "include",
		});
	}

	async previewInvoice(
		customerId: string,
		invoiceItems?: any[]
	): Promise<Stripe.Invoice> {
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		const params: any = {};

		// If invoice items are provided, create an isolated preview with only those items
		if (invoiceItems && invoiceItems.length > 0) {
			params.invoice_items = invoiceItems;
			// Don't include customer to avoid pulling in subscriptions and pending items
		} else {
			// Fallback to customer-based preview if no specific items
			params.customer = customerId;
		}

		return await this._stripe.invoices.createPreview(params);
	}

	async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
		return await this._stripe.invoices.finalizeInvoice(invoiceId);
	}

	async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
		return await this._stripe.invoices.sendInvoice(invoiceId);
	}

	async deleteInvoiceItem(
		invoiceItemId: string
	): Promise<Stripe.DeletedInvoiceItem> {
		return await this._stripe.invoiceItems.del(invoiceItemId);
	}

	// Create recurring invoice using subscription schedules with custom items
	async createRecurringInvoiceSchedule(
		customerId: string,
		items: Array<{
			price_data: {
				currency: string;
				product_data: {
					name: string;
					description?: string;
				};
				unit_amount: number;
				recurring: {
					interval: "month" | "year" | "week" | "day";
					interval_count?: number;
				};
			};
			quantity: number;
		}>,
		startDate: Date,
		endDate?: Date
	): Promise<Stripe.SubscriptionSchedule> {
		if (!this._customer) {
			throw new Error("Customer not set");
		}
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		const accountDestination = {
			type: "account" as const,
			account: this._accountId,
		};

		// Create prices for each item first, then use them in the schedule
		const scheduleItems: Array<{ price: string; quantity: number }> = [];
		for (const item of items) {
			// Create product for this item
			const productData: any = {
				name: item.price_data.product_data.name,
			};

			// Only include description if it's not empty
			if (
				item.price_data.product_data.description &&
				item.price_data.product_data.description.trim() !== ""
			) {
				productData.description = item.price_data.product_data.description;
			}

			const product = await this._stripe.products.create(productData);

			// Create the price
			const price = await this._stripe.prices.create({
				currency: item.price_data.currency,
				product: product.id,
				unit_amount: item.price_data.unit_amount,
				recurring: {
					interval: item.price_data.recurring.interval,
					interval_count: item.price_data.recurring.interval_count || 1,
				},
			});

			scheduleItems.push({
				price: price.id,
				quantity: item.quantity,
			});
		}

		const options: Stripe.SubscriptionScheduleCreateParams = {
			customer: customerId,
			start_date: Math.floor(startDate.getTime() / 1000),
			end_behavior: "cancel",
			phases: [
				{
					items: scheduleItems,
					transfer_data: {
						destination: this._accountId,
					},
					invoice_settings: { issuer: accountDestination },
					billing_cycle_anchor: "automatic",
					collection_method: "charge_automatically",
					...(endDate && { end_date: Math.floor(endDate.getTime() / 1000) }),
				},
			],
		};

		return await this._stripe.subscriptionSchedules.create(options);
	}

	// Release a subscription schedule to activate it
	async releaseSubscriptionSchedule(
		scheduleId: string
	): Promise<Stripe.SubscriptionSchedule> {
		if (!this._accountId) {
			throw new Error("Account ID not set");
		}

		return await this._stripe.subscriptionSchedules.release(scheduleId);
	}
}

async function getStripeCustomer(params: { id: string; mid: string }) {
	const member = await db.query.members.findFirst({
		where: (member, { eq }) => eq(member.id, params.mid),
	});

	if (!member || !member.stripeCustomerId) {
		throw new Error("Member not found");
	}

	const integration = await db.query.integrations.findFirst({
		where: (integration, { eq, and }) =>
			and(
				eq(integration.locationId, params.id),
				eq(integration.service, "stripe")
			),
		columns: {
			accountId: true,
		},
	});

	if (!integration) {
		throw new Error("Integration not found");
	}

	const stripe = new MemberStripePayments(integration.accountId).setCustomer(
		member.stripeCustomerId
	);
	return stripe;
}

export { VendorStripePayments, MemberStripePayments, getStripeCustomer };
